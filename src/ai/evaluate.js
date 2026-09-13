import { UNITS, SKILL, hasSkill } from '../core/units.js';
import { previewAttack, chebyshev, defenseBonusFor } from '../core/combat.js';
import { A, HARVEST } from '../core/actions.js';
import { TECHS } from '../core/tech.js';
import { BUILDING_INFO } from '../core/economy.js';
import { TERRAIN } from '../core/constants.js';

/** Rough worth of a unit, used for trade evaluation. */
export function unitValue(unit) {
  const base = UNITS[unit.type];
  if (base.super) return 40;
  return (base.cost || 5) + base.maxHp / 3 + (unit.veteran ? 3 : 0);
}

export function nearestEnemyCity(state, playerId, from) {
  let best = null, bestD = Infinity;
  for (const c of state.cities) {
    if (c.owner === playerId) continue;
    const d = chebyshev(from, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ? { city: best, dist: bestD } : null;
}

export function nearestOwnCityUnderThreat(state, playerId) {
  for (const c of state.citiesOf(playerId)) {
    const threat = state.units.some((u) => u.owner !== playerId && chebyshev(u, c) <= 2);
    if (threat) return c;
  }
  return null;
}

/** How many enemies could hit this square next turn. */
export function exposure(state, playerId, x, y) {
  let n = 0;
  for (const u of state.units) {
    if (u.owner === playerId) continue;
    const reach = UNITS[u.type].mov + UNITS[u.type].rng;
    if (chebyshev({ x, y }, u) <= reach) n += 1;
  }
  return n;
}

/**
 * Score a single legal action. Same preview functions the UI uses, so the AI
 * never has information the player cannot compute.
 */
export function scoreAction(state, action, ctx, W) {
  switch (action.type) {
    case A.ATTACK:   return scoreAttack(state, action, ctx, W);
    case A.CAPTURE:  return scoreCapture(state, action, ctx, W);
    case A.MOVE:     return scoreMove(state, action, ctx, W);
    case A.RECOVER:  return scoreRecover(state, action, ctx, W);
    case A.TRAIN:    return scoreTrain(state, action, ctx, W);
    case A.RESEARCH: return scoreResearch(state, action, ctx, W);
    case A.BUILD:    return (BUILDING_INFO[action.building].pop || 1) * W.economy + 3;
    case A.HARVEST:  return (HARVEST[state.tileAt(action.x, action.y).resource].pop || 1) * W.economy + 3;
    case A.REWARD:   return scoreReward(action, W);
    case A.UPGRADE:  return W.navalUpgrade * (UNITS[action.to].atk + UNITS[action.to].def);
    default:         return -Infinity;
  }
}

function scoreAttack(state, action, ctx, W) {
  const unit = state.unitById(action.unitId);
  const target = state.unitById(action.targetId);
  const r = previewAttack(state, unit, target);
  let v = r.attackDamage * W.damage;
  if (r.defenderDies) v += unitValue(target) * W.kill;
  v -= r.defenseDamage * W.retaliation;
  if (r.attackerDies) v -= unitValue(unit) * W.loseUnit;
  // killing a unit that sits on one of our cities is worth more
  const tile = state.tileAt(target.x, target.y);
  if (tile.city && tile.city.owner === ctx.playerId) v += W.defendCity;
  // pressure on a city we want: trading evenly is how cities actually fall
  const onEnemyCity = tile.city && tile.city.owner !== ctx.playerId;
  if (onEnemyCity) v += W.siege;
  // softening a walled defender still has value for the catapult
  if (!r.defenderDies && r.attackDamage < 2 && !onEnemyCity) v -= 2;
  return v;
}

function scoreCapture(state, action, ctx, W) {
  const unit = state.unitById(action.unitId);
  const city = state.cityAt(unit.x, unit.y);
  return W.capture + (city.capital ? W.captureCapital : 0) + city.level * 4;
}

function scoreMove(state, action, ctx, W) {
  const unit = state.unitById(action.unitId);
  const from = { x: unit.x, y: unit.y };
  const to = { x: action.x, y: action.y };
  const tile = state.tileAt(to.x, to.y);
  let v = 0;

  // capturing next turn: standing on an unowned city is very good
  if (tile.city && tile.city.owner !== ctx.playerId) v += W.capture * 0.9;

  const targetCity = ctx.focus || nearestEnemyCity(state, ctx.playerId, from)?.city;
  if (targetCity) {
    const before = chebyshev(from, targetCity);
    const after = chebyshev(to, targetCity);
    v += (before - after) * W.advance;
  }

  // prefer defensible ground
  if (tile.terrain === TERRAIN.MOUNTAIN) v += W.terrain;
  if (tile.city && tile.city.owner === ctx.playerId) v += W.terrain * 0.8;

  // Exposure is scored as a CHANGE, and only healthy units are allowed to
  // profit from retreating. Scoring it as an absolute made units oscillate:
  // advancing was punished, backing off was rewarded, so they danced forever
  // two tiles from the objective instead of ever making contact.
  const expDelta = exposure(state, ctx.playerId, to.x, to.y)
                 - exposure(state, ctx.playerId, from.x, from.y);
  const hurt = unit.hp / unit.maxHp < 0.5;
  if (expDelta > 0) v -= expDelta * W.exposure * fragility(unit);
  else if (hurt) v -= expDelta * W.exposure * 0.5;

  // exploration: unseen tiles around the destination
  const player = state.players.find((p) => p.id === ctx.playerId);
  let unseen = 0;
  for (const t of state.map.within(to.x, to.y, 1)) {
    if (!player.explored.has(state.index(t.x, t.y))) unseen += 1;
  }
  v += unseen * W.explore;

  // a unit that can attack after moving should move into range
  if (hasSkill(unit.type, SKILL.DASH)) {
    const rng = UNITS[unit.type].rng;
    const inRange = state.units.some((u) => u.owner !== ctx.playerId && chebyshev(to, u) <= rng);
    if (inRange) v += W.engage;
  }
  return v;
}

/** Squishy, expensive units should avoid exposure more than warriors do. */
function fragility(unit) {
  const base = UNITS[unit.type];
  if (base.rng > 1) return 2.0;      // catapults, archers
  if (base.def <= 1) return 1.5;
  return 1.0;
}

function scoreRecover(state, action, ctx, W) {
  const unit = state.unitById(action.unitId);
  const missing = unit.maxHp - unit.hp;
  if (missing <= 0) return -Infinity;
  const risk = exposure(state, ctx.playerId, unit.x, unit.y);
  return missing * W.heal - risk * W.exposure;
}

function scoreTrain(state, action, ctx, W) {
  const type = action.unit;
  const base = UNITS[type];

  // Value per star, not raw efficiency: judging purely on power/cost makes the
  // AI buy nothing but Warriors forever, which is exactly how the original
  // game's AI plays and why it is easy to beat.
  const power = base.atk * 1.6 + base.def * 1.2 + base.maxHp / 4 + base.mov * 1.2
              + (base.rng > 1 ? 3 : 0);
  let v = (power / (base.cost + 2)) * W.train;

  // army composition: diminishing returns on more of the same thing
  const have = state.unitsOf(ctx.playerId).filter((u) => u.type === type).length;
  v -= have * W.duplicate;

  if (base.rng > 1) v += W.ranged;
  if (ctx.enemyHasWalls && base.rng >= 3) v += W.siegeUnit;
  if (ctx.posture === 'attack' && base.atk >= 3) v += 3;
  if (ctx.posture === 'defend' && base.def >= 3) v += 4;
  if (ctx.posture === 'expand' && base.mov >= 2) v += 3;
  if (ctx.armySize >= ctx.armyCap) v -= 8;
  return v;
}

function scoreResearch(state, action, ctx, W) {
  const idx = ctx.techPlan.indexOf(action.tech);
  if (idx < 0) return -1;
  let v = (ctx.techPlan.length - idx) * W.research;
  // Walls are unbreakable without siege, so the tech that unlocks catapults has
  // to outrank cheap early techs rather than sit at the end of a priority list.
  if (ctx.enemyHasWalls && (action.tech === 'mathematics' || action.tech === 'forestry')) {
    v += W.siegeUnit * 2;
  }
  return v;
}

function scoreReward(action, W) {
  const order = { giant: 100, walls: 40, workshop: 35, resources: 25, border: 20, park: 15, park5: 15, explorer: 10 };
  return (order[action.reward] || 5) * W.reward;
}
