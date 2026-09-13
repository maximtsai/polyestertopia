import { ECONOMY, SCORE, BUILDING } from './constants.js';
import { TECHS } from './tech.js';
import { EV } from './events.js';
import { makeUnit } from './state.js';

/** Stars gained at the start of a player's turn. */
export function incomeOf(state, playerId) {
  return state.citiesOf(playerId).reduce((sum, c) => sum + ECONOMY.incomeForLevel(c.level), 0);
}

/**
 * City level-up rewards. Two choices per tier, exactly as in Polytopia:
 * the player picks one and the other is lost.
 */
export const REWARDS = {
  2: [
    { id: 'workshop',  name: 'Workshop',  desc: '+1 star per turn' },
    { id: 'explorer',  name: 'Explorer',  desc: 'Reveal a patch of the map' },
  ],
  3: [
    { id: 'walls',     name: 'City Walls', desc: 'x4 defence for units in this city' },
    { id: 'resources', name: 'Resources',  desc: '+5 stars now' },
  ],
  4: [
    { id: 'park',      name: 'Park',       desc: '+250 score' },
    { id: 'border',    name: 'Border Growth', desc: 'Territory expands by one ring' },
  ],
  5: [
    { id: 'giant',     name: 'Giant',      desc: 'Spawn a Giant in this city' },
    { id: 'park5',     name: 'Park',       desc: '+250 score' },
  ],
};

export function rewardsFor(city) {
  return REWARDS[Math.min(city.level, 5)] || REWARDS[5];
}

export function addPopulation(state, city, amount) {
  city.population += amount;
  let leveled = false;
  while (city.population >= ECONOMY.popForLevel(city.level)) {
    city.population -= ECONOMY.popForLevel(city.level);
    city.level += 1;
    city.pendingReward = true;
    leveled = true;
    state.events.emit(EV.CITY_LEVELED, { city });
  }
  return leveled;
}

export function applyReward(state, city, rewardId) {
  const player = state.players.find((p) => p.id === city.owner);
  switch (rewardId) {
    case 'workshop':  city.workshop = true; break;
    case 'explorer':  exploreRandomPatch(state, player); break;
    case 'walls':     city.walls = true; break;
    case 'resources': player.stars += 5; break;
    case 'park':
    case 'park5':     city.park = true; player.score += 250; break;
    case 'border':    growBorder(state, city); break;
    case 'giant':     state.addUnit(Object.assign(makeUnit(city.owner, 'giant', city.x, city.y), { homeCity: { x: city.x, y: city.y } })); break;
  }
  city.rewardsTaken.push(rewardId);
  city.pendingReward = false;
}

function exploreRandomPatch(state, player) {
  const unexplored = state.map.tiles.filter((t) => !player.explored.has(state.index(t.x, t.y)));
  if (!unexplored.length) return;
  const t = state.rng.pick(unexplored);
  state.reveal(player.id, t.x, t.y, 2);
}

export function growBorder(state, city) {
  for (const t of state.map.within(city.x, city.y, 2)) {
    if (t.owner === null) {
      t.owner = city.owner;
      t.cityRef = { x: city.x, y: city.y };
      state.events.emit(EV.TILE_CLAIMED, { tile: t });
    }
  }
}

/** Claim the 3x3 territory around a newly acquired city. */
export function claimTerritory(state, city) {
  const centre = state.tileAt(city.x, city.y);
  centre.owner = city.owner;
  centre.cityRef = { x: city.x, y: city.y };
  for (const t of state.map.within(city.x, city.y, 1)) {
    if (t.owner === null || t.cityRef && t.cityRef.x === city.x && t.cityRef.y === city.y) {
      t.owner = city.owner;
      t.cityRef = { x: city.x, y: city.y };
    }
  }
}

export function scoreOf(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  let score = 0;
  for (const id of player.techs) score += SCORE.TECH_TIER[TECHS[id].tier];
  for (const c of state.citiesOf(playerId)) {
    score += c.level * SCORE.CITY_LEVEL * 10;
    if (c.park) score += 250;
  }
  for (const u of state.unitsOf(playerId)) score += SCORE.UNIT;
  score += player.explored.size * SCORE.TILE_EXPLORED;
  for (const t of state.map.tiles) if (t.owner === playerId && t.building) score += SCORE.BUILDING;
  return score;
}

export const BUILDING_INFO = {
  [BUILDING.FARM]:       { cost: 5, pop: 2, on: 'crop',  tech: 'farming' },
  [BUILDING.MINE]:       { cost: 5, pop: 2, on: 'metal', tech: 'mining' },
  [BUILDING.LUMBER_HUT]: { cost: 3, pop: 1, on: null,    tech: 'forestry' },
  [BUILDING.PORT]:       { cost: 7, pop: 2, on: null,    tech: 'sailing' },
  [BUILDING.TEMPLE]:     { cost: 20, pop: 1, on: null,   tech: 'meditation' },
  [BUILDING.FORGE]:      { cost: 5, pop: 2, on: null,    tech: 'smithery' },
  [BUILDING.SAWMILL]:    { cost: 5, pop: 1, on: null,    tech: 'mathematics' },
  [BUILDING.WINDMILL]:   { cost: 5, pop: 1, on: null,    tech: 'construction' },
  [BUILDING.MARKET]:     { cost: 5, pop: 1, on: null,    tech: 'trade' },
};
