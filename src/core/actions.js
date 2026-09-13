import { TERRAIN, BUILDING, RESOURCE, COMBAT, isLand, isSea } from './constants.js';
import { UNITS, SKILL, hasSkill } from './units.js';
import { TECHS, techCost, canResearch, unlocksOf, unitsAvailable } from './tech.js';
import { previewAttack, chebyshev } from './combat.js';
import { EV } from './events.js';
import { makeUnit, makeCity } from './state.js';
import {
  incomeOf, addPopulation, applyReward, rewardsFor, claimTerritory,
  BUILDING_INFO, scoreOf,
} from './economy.js';
import { isVessel, board, disembark, upgradeOptions, upgradeVessel } from './naval.js';

export const A = {
  MOVE: 'move',
  ATTACK: 'attack',
  CAPTURE: 'capture',
  RECOVER: 'recover',
  TRAIN: 'train',
  RESEARCH: 'research',
  BUILD: 'build',
  HARVEST: 'harvest',
  REWARD: 'reward',
  UPGRADE: 'upgrade',
  HEAL_OTHERS: 'heal_others',
  END_TURN: 'end_turn',
};

export const HARVEST = {
  [RESOURCE.FRUIT]: { cost: 2, pop: 1, tech: 'organization' },
  [RESOURCE.GAME]:  { cost: 2, pop: 1, tech: 'hunting' },
  [RESOURCE.FISH]:  { cost: 2, pop: 1, tech: 'fishing' },
  [RESOURCE.WHALE]: { cost: 6, pop: 0, stars: 10, tech: 'aquaculture' },
};

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

/** Tiles this unit may legally move to this turn. */
export function legalMoves(state, unit) {
  if (unit.moved) return [];
  const player = state.players.find((p) => p.id === unit.owner);
  const unlocked = unlocksOf(player);
  const maxMov = UNITS[unit.type].mov;
  const start = state.tileAt(unit.x, unit.y);

  const best = new Map();           // "x,y" -> remaining movement
  const key = (t) => `${t.x},${t.y}`;
  best.set(key(start), maxMov);
  const out = new Map();
  const queue = [[start, maxMov]];

  while (queue.length) {
    const [tile, left] = queue.shift();
    if (left <= 0) continue;
    for (const nb of state.map.neighbors(tile.x, tile.y)) {
      if (state.unitAt(nb.x, nb.y)) continue;                  // blocked by any unit
      const entry = entryRule(state, unit, nb, unlocked);
      if (!entry.allowed) continue;
      const step = tile.road && nb.road ? 0.5 : 1;
      let rem = left - step;
      if (rem < 0) continue;
      if (entry.endsMovement) rem = 0;
      if (adjacentEnemy(state, unit.owner, nb)) rem = 0;       // zone of control
      const k = key(nb);
      if (best.has(k) && best.get(k) >= rem) continue;
      best.set(k, rem);
      out.set(k, { x: nb.x, y: nb.y, board: entry.board, disembark: entry.disembark });
      queue.push([nb, rem]);
    }
  }
  return [...out.values()];
}

function entryRule(state, unit, tile, unlocked) {
  const no = { allowed: false };
  const vessel = isVessel(unit);

  if (vessel) {
    if (isSea(tile.terrain)) {
      if (tile.terrain === TERRAIN.OCEAN && !unlocked.has('move:ocean')) return no;
      if (!unlocked.has('move:water')) return no;
      return { allowed: true, endsMovement: false, board: false, disembark: false };
    }
    // a carried unit may step back onto friendly land
    if (isLand(tile.terrain) && unit.carrying) {
      return { allowed: true, endsMovement: true, board: false, disembark: true };
    }
    return no;
  }

  if (isLand(tile.terrain)) {
    if (tile.terrain === TERRAIN.MOUNTAIN && !unlocked.has('move:mountain')) return no;
    return {
      allowed: true,
      endsMovement: tile.terrain === TERRAIN.MOUNTAIN,
      board: false, disembark: false,
    };
  }

  // land unit stepping into water: only onto a port tile it owns
  if (tile.building === BUILDING.PORT && tile.owner === unit.owner) {
    return { allowed: true, endsMovement: true, board: true, disembark: false };
  }
  return no;
}

function adjacentEnemy(state, owner, tile) {
  return state.map.neighbors(tile.x, tile.y).some((n) => {
    const u = state.unitAt(n.x, n.y);
    return u && u.owner !== owner;
  });
}

// ---------------------------------------------------------------------------
// Attacks
// ---------------------------------------------------------------------------

export function legalAttacks(state, unit) {
  if (unit.attacked) return [];
  if (unit.moved && !hasSkill(unit.type, SKILL.DASH)) return [];
  if (UNITS[unit.type].atk <= 0) return [];
  const range = UNITS[unit.type].rng;
  return state.units.filter(
    (u) => u.owner !== unit.owner && chebyshev(unit, u) <= range
  );
}

export function legalCapture(state, unit) {
  if (isVessel(unit) || unit.moved || unit.attacked) return false;
  const tile = state.tileAt(unit.x, unit.y);
  return !!tile.city && tile.city.owner !== unit.owner;
}

// ---------------------------------------------------------------------------
// Action generation (used by the UI for hints and by the AI for search)
// ---------------------------------------------------------------------------

export function generateActions(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  const acts = [];

  for (const unit of state.unitsOf(playerId)) {
    for (const m of legalMoves(state, unit)) acts.push({ type: A.MOVE, unitId: unit.id, x: m.x, y: m.y });
    for (const t of legalAttacks(state, unit)) acts.push({ type: A.ATTACK, unitId: unit.id, targetId: t.id });
    if (legalCapture(state, unit)) acts.push({ type: A.CAPTURE, unitId: unit.id });
    if (!unit.moved && !unit.attacked && unit.hp < unit.maxHp) acts.push({ type: A.RECOVER, unitId: unit.id });
    for (const to of upgradeOptions(state, unit, player)) {
      if (player.stars >= UNITS[to].cost) acts.push({ type: A.UPGRADE, unitId: unit.id, to });
    }
  }

  for (const city of state.citiesOf(playerId)) {
    if (city.pendingReward) {
      for (const r of rewardsFor(city)) acts.push({ type: A.REWARD, x: city.x, y: city.y, reward: r.id });
      continue; // must resolve the reward before doing anything else with this city
    }
    if (state.unitAt(city.x, city.y) || city.unitCount >= city.level + 1) continue;
    for (const type of unitsAvailable(player)) {
      if (player.stars >= UNITS[type].cost) acts.push({ type: A.TRAIN, x: city.x, y: city.y, unit: type });
    }
  }

  const cityCount = state.citiesOf(playerId).length;
  for (const id of Object.keys(TECHS)) {
    if (canResearch(player, id) && player.stars >= techCost(TECHS[id].tier, cityCount)) {
      acts.push({ type: A.RESEARCH, tech: id });
    }
  }

  const unlocked = unlocksOf(player);
  for (const tile of state.map.tiles) {
    if (tile.owner !== playerId) continue;
    if (tile.resource && HARVEST[tile.resource]) {
      const h = HARVEST[tile.resource];
      if (player.techs.includes(h.tech) && player.stars >= h.cost) {
        acts.push({ type: A.HARVEST, x: tile.x, y: tile.y });
      }
    }
    for (const [b, info] of Object.entries(BUILDING_INFO)) {
      if (tile.building) break;
      if (!unlocked.has(`build:${b}`)) continue;
      if (!buildingFits(state, tile, b)) continue;
      if (player.stars >= info.cost) acts.push({ type: A.BUILD, x: tile.x, y: tile.y, building: b });
    }
  }

  acts.push({ type: A.END_TURN });
  return acts;
}

/**
 * Placement rules. The advanced buildings are one-per-city and need an adjacent
 * source building, exactly as in Polytopia - without that the AI (and a bored
 * player) can carpet every field tile with forges.
 */
function buildingFits(state, tile, building) {
  const plain = tile.terrain === TERRAIN.FIELD && !tile.city;
  switch (building) {
    case BUILDING.FARM:       return tile.resource === RESOURCE.CROP;
    case BUILDING.MINE:       return tile.resource === RESOURCE.METAL;
    case BUILDING.LUMBER_HUT: return tile.terrain === TERRAIN.FOREST;
    case BUILDING.PORT:       return tile.terrain === TERRAIN.WATER
                                     && uniqueInCity(state, tile, building);
    case BUILDING.TEMPLE:     return plain && uniqueInCity(state, tile, building);
    case BUILDING.FORGE:      return plain && uniqueInCity(state, tile, building)
                                     && adjacentTo(state, tile, BUILDING.MINE);
    case BUILDING.SAWMILL:    return plain && uniqueInCity(state, tile, building)
                                     && adjacentTo(state, tile, BUILDING.LUMBER_HUT);
    case BUILDING.WINDMILL:   return plain && uniqueInCity(state, tile, building)
                                     && adjacentTo(state, tile, BUILDING.FARM);
    case BUILDING.MARKET:     return plain && uniqueInCity(state, tile, building)
                                     && state.map.neighbors(tile.x, tile.y).some((n) => n.building);
    default:                  return plain;
  }
}

function uniqueInCity(state, tile, building) {
  if (!tile.cityRef) return false;
  return !state.map.tiles.some(
    (t) => t.building === building && t.cityRef
        && t.cityRef.x === tile.cityRef.x && t.cityRef.y === tile.cityRef.y);
}

function adjacentTo(state, tile, building) {
  return state.map.neighbors(tile.x, tile.y).some((n) => n.building === building);
}

// ---------------------------------------------------------------------------
// Apply - the ONLY mutation path. Player input and AI both go through here.
// ---------------------------------------------------------------------------

export function apply(state, action) {
  const player = state.player;
  switch (action.type) {
    case A.MOVE:      return doMove(state, action);
    case A.ATTACK:    return doAttack(state, action);
    case A.CAPTURE:   return doCapture(state, action);
    case A.RECOVER:   return doRecover(state, action);
    case A.TRAIN:     return doTrain(state, action, player);
    case A.RESEARCH:  return doResearch(state, action, player);
    case A.BUILD:     return doBuild(state, action, player);
    case A.HARVEST:   return doHarvest(state, action, player);
    case A.REWARD:    return doReward(state, action);
    case A.UPGRADE:   return doUpgrade(state, action, player);
    case A.END_TURN:  return endTurn(state);
    default: throw new Error(`Unknown action ${action.type}`);
  }
}

function doMove(state, { unitId, x, y }) {
  const unit = state.unitById(unitId);
  const target = legalMoves(state, unit).find((m) => m.x === x && m.y === y);
  if (!target) return false;
  const from = { x: unit.x, y: unit.y };
  unit.x = x; unit.y = y;
  if (target.board) board(state, unit);
  if (target.disembark) disembark(state, unit);
  unit.moved = true;
  if (!hasSkill(unit.type, SKILL.DASH)) unit.attacked = true;
  state.reveal(unit.owner, x, y, hasSkill(unit.type, SKILL.SCOUT) ? 2 : 1);
  state.events.emit(EV.UNIT_MOVED, { unit, from, to: { x, y } });
  return true;
}

function doAttack(state, { unitId, targetId }) {
  const unit = state.unitById(unitId);
  const target = state.unitById(targetId);
  if (!unit || !target) return false;
  if (!legalAttacks(state, unit).includes(target)) return false;

  const result = previewAttack(state, unit, target);
  target.hp -= result.attackDamage;
  state.events.emit(EV.UNIT_ATTACKED, { unit, target, result });

  if (target.hp <= 0) {
    killUnit(state, target, unit);
  } else if (result.defenseDamage > 0) {
    unit.hp -= result.defenseDamage;
    if (unit.hp <= 0) killUnit(state, unit, target);
  }

  if (hasSkill(unit.type, SKILL.SPLASH)) {
    for (const n of state.map.neighbors(target.x, target.y)) {
      const other = state.unitAt(n.x, n.y);
      if (other && other.owner !== unit.owner) {
        other.hp -= Math.round(result.attackDamage / 2);
        if (other.hp <= 0) killUnit(state, other, unit);
      }
    }
  }

  if (state.unitById(unitId)) {
    unit.attacked = true;
    const killed = result.defenderDies;
    if (killed && hasSkill(unit.type, SKILL.PERSIST)) unit.attacked = false;
    if (!hasSkill(unit.type, SKILL.ESCAPE)) unit.moved = true;
  }
  return true;
}

function killUnit(state, victim, killer) {
  state.removeUnit(victim);
  state.events.emit(EV.UNIT_DIED, { unit: victim, killer });
  if (victim.homeCity) {
    const c = state.cityAt(victim.homeCity.x, victim.homeCity.y);
    if (c) c.unitCount = Math.max(0, c.unitCount - 1);
  }
  if (!killer || UNITS[killer.type].super) return;
  killer.kills += 1;
  if (!killer.veteran && killer.kills >= COMBAT.VETERAN_KILLS) {
    killer.veteran = true;
    killer.maxHp += COMBAT.VETERAN_HP_BONUS;
    killer.hp = killer.maxHp;
    state.events.emit(EV.UNIT_PROMOTED, { unit: killer });
  }
}

function doCapture(state, { unitId }) {
  const unit = state.unitById(unitId);
  if (!legalCapture(state, unit)) return false;
  const city = state.tileAt(unit.x, unit.y).city;
  const previous = city.owner;
  city.owner = unit.owner;
  city.unitCount = 0;
  claimTerritory(state, city);
  unit.moved = true;
  unit.attacked = true;
  state.events.emit(EV.CITY_CAPTURED, { city, from: previous, by: unit.owner });
  checkElimination(state, previous);
  return true;
}

function doRecover(state, { unitId }) {
  const unit = state.unitById(unitId);
  const tile = state.tileAt(unit.x, unit.y);
  const amount = tile.owner === unit.owner ? COMBAT.HEAL_IN_TERRITORY : COMBAT.HEAL_OUTSIDE;
  unit.hp = Math.min(unit.maxHp, unit.hp + amount);
  unit.moved = true;
  unit.attacked = true;
  state.events.emit(EV.UNIT_HEALED, { unit, amount });
  return true;
}

function doTrain(state, { x, y, unit: type }, player) {
  const city = state.cityAt(x, y);
  if (!city || city.owner !== player.id || state.unitAt(x, y)) return false;
  if (player.stars < UNITS[type].cost) return false;
  player.stars -= UNITS[type].cost;
  city.unitCount += 1;
  const u = makeUnit(player.id, type, x, y);
  u.homeCity = { x, y };
  u.moved = true;
  u.attacked = true;
  state.addUnit(u);
  return true;
}

function doResearch(state, { tech }, player) {
  if (!canResearch(player, tech)) return false;
  const cost = techCost(TECHS[tech].tier, state.citiesOf(player.id).length);
  if (player.stars < cost) return false;
  player.stars -= cost;
  player.techs.push(tech);
  state.events.emit(EV.TECH_RESEARCHED, { player, tech });
  return true;
}

function doBuild(state, { x, y, building }, player) {
  const tile = state.tileAt(x, y);
  const info = BUILDING_INFO[building];
  if (!tile || tile.building || tile.owner !== player.id || player.stars < info.cost) return false;
  player.stars -= info.cost;
  tile.building = building;
  if (building === BUILDING.PORT) { tile.owner = player.id; }
  const city = tile.cityRef && state.cityAt(tile.cityRef.x, tile.cityRef.y);
  if (city && info.pop) addPopulation(state, city, info.pop);
  state.events.emit(EV.BUILDING_BUILT, { tile, building });
  return true;
}

function doHarvest(state, { x, y }, player) {
  const tile = state.tileAt(x, y);
  const h = HARVEST[tile.resource];
  if (!h || player.stars < h.cost) return false;
  player.stars -= h.cost;
  if (h.stars) player.stars += h.stars;
  const city = tile.cityRef && state.cityAt(tile.cityRef.x, tile.cityRef.y);
  if (city && h.pop) addPopulation(state, city, h.pop);
  tile.resource = null;
  return true;
}

function doReward(state, { x, y, reward }) {
  const city = state.cityAt(x, y);
  if (!city || !city.pendingReward) return false;
  applyReward(state, city, reward);
  return true;
}

function doUpgrade(state, { unitId, to }, player) {
  const unit = state.unitById(unitId);
  if (player.stars < UNITS[to].cost) return false;
  player.stars -= UNITS[to].cost;
  upgradeVessel(state, unit, to);
  return true;
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

export function startTurn(state) {
  const player = state.player;
  player.stars += incomeOf(state, player.id);
  for (const u of state.unitsOf(player.id)) {
    u.moved = false;
    u.attacked = false;
    state.reveal(player.id, u.x, u.y, hasSkill(u.type, SKILL.SCOUT) ? 2 : 1);
  }
  for (const c of state.citiesOf(player.id)) state.reveal(player.id, c.x, c.y, 1);
  state.events.emit(EV.TURN_STARTED, { player, turn: state.turn });
}

export function endTurn(state) {
  state.events.emit(EV.TURN_ENDED, { player: state.player, turn: state.turn });
  let guard = 0;
  do {
    state.current = (state.current + 1) % state.players.length;
    if (state.current === 0) state.turn += 1;
    guard += 1;
  } while (state.player.eliminated && guard < state.players.length * 2);
  startTurn(state);
  return true;
}

export function checkElimination(state, playerId) {
  if (playerId === null || playerId === undefined) return;
  const p = state.players.find((q) => q.id === playerId);
  if (!p || p.eliminated) return;
  if (state.citiesOf(playerId).length === 0 && state.unitsOf(playerId).length === 0) {
    p.eliminated = true;
  }
}

export { scoreOf };
