import { TECHS } from '../core/tech.js';
import { scoreOf } from '../core/economy.js';
import { nearestEnemyCity, nearestOwnCityUnderThreat } from './evaluate.js';

/**
 * Difficulty is expressed only as weights + a mistake rate, so every level runs
 * the same code. Level 1 plays loose on purpose; level 4 plays properly.
 */
export const DIFFICULTY = {
  1: { name: 'Scout',    mistakeRate: 0.35, armyCapPerCity: 2, weights: base({ kill: 1.2, advance: 1.2, exposure: 0.4 }) },
  2: { name: 'Raider',   mistakeRate: 0.18, armyCapPerCity: 3, weights: base({}) },
  3: { name: 'Warlord',  mistakeRate: 0.07, armyCapPerCity: 3, weights: base({ kill: 2.2, exposure: 1.3, economy: 1.4 }) },
  4: { name: 'Ragnarok', mistakeRate: 0.0,  armyCapPerCity: 4, weights: base({ kill: 2.6, exposure: 1.5, economy: 1.6, capture: 34, research: 2.4 }) },
};

function base(overrides) {
  return {
    damage: 0.9,
    kill: 1.8,
    retaliation: 0.7,
    loseUnit: 1.6,
    capture: 28,
    captureCapital: 40,
    defendCity: 8,
    siege: 5.0,
    duplicate: 2.5,
    ranged: 3.0,
    siegeUnit: 5.0,
    advance: 2.4,
    terrain: 2.5,
    exposure: 1.0,
    explore: 0.6,
    engage: 3.0,
    heal: 0.5,
    train: 4.0,
    research: 2.0,
    economy: 4.0,
    reward: 0.4,
    navalUpgrade: 1.2,
    ...overrides,
  };
}

const TECH_PRIORITY = {
  expand:  ['riding', 'organization', 'hunting', 'climbing', 'farming', 'roads', 'sailing'],
  develop: ['organization', 'farming', 'hunting', 'forestry', 'mining', 'construction', 'trade', 'smithery'],
  attack:  ['archery', 'riding', 'smithery', 'mathematics', 'chivalry', 'climbing'],
  defend:  ['strategy', 'archery', 'climbing', 'smithery', 'mathematics'],
};

/** Once per turn: read the board, pick a posture, and build a tech plan. */
export function think(state, playerId, difficulty) {
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY[2];
  const myCities = state.citiesOf(playerId).length;
  const myUnits = state.unitsOf(playerId);
  const enemies = state.players.filter((p) => p.id !== playerId && !p.eliminated);
  const enemyCities = enemies.reduce((n, e) => n + state.citiesOf(e.id).length, 0);
  const myArmy = myUnits.reduce((n, u) => n + u.hp, 0);
  const enemyArmy = enemies.reduce(
    (n, e) => n + state.unitsOf(e.id).reduce((m, u) => m + u.hp, 0), 0);

  const threatened = nearestOwnCityUnderThreat(state, playerId);
  let posture;
  if (threatened) posture = 'defend';
  else if (myArmy > enemyArmy * 1.25 && myUnits.length >= 3) posture = 'attack';
  else if (myCities <= enemyCities) posture = 'expand';
  else posture = 'develop';

  const neutral = state.cities.filter((c) => c.owner === null);
  const focus = threatened
    || (posture === 'expand' && neutral.length
        ? nearestNeutral(state, playerId, neutral)
        : nearestEnemyCity(state, playerId, myUnits[0] || { x: 0, y: 0 })?.city);

  const plan = (TECH_PRIORITY[posture] || []).filter((t) => TECHS[t]);

  // Only chase naval tech when there is water worth crossing near our land.
  const nearWater = state.map.tiles.some(
    (t) => (t.terrain === 'water' || t.terrain === 'ocean') && t.owner === playerId);
  if (nearWater) plan.push('fishing', 'sailing');

  const enemyHasWalls = state.cities.some((c) => c.owner !== playerId && c.walls);
  if (enemyHasWalls && !plan.includes('mathematics')) plan.push('forestry', 'mathematics');
  return {
    playerId,
    posture,
    focus,
    techPlan: plan,
    enemyHasWalls,
    armySize: myUnits.length,
    armyCap: Math.max(2, myCities * cfg.armyCapPerCity),
    weights: cfg.weights,
    mistakeRate: cfg.mistakeRate,
  };
}

function nearestNeutral(state, playerId, neutral) {
  const units = state.unitsOf(playerId);
  if (!units.length) return neutral[0];
  let best = null, bestD = Infinity;
  for (const c of neutral) {
    for (const u of units) {
      const d = Math.max(Math.abs(u.x - c.x), Math.abs(u.y - c.y));
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return best;
}
