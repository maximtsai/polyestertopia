// Every tunable multiplier lives here. Nothing numeric is inlined in the rules.

export const TERRAIN = {
  FIELD: 'field',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',   // shallow, reachable from a port
  OCEAN: 'ocean',   // deep, needs Navigation
};

export const RESOURCE = {
  FRUIT: 'fruit',     // field
  CROP: 'crop',       // field, needs Farming
  GAME: 'game',       // forest
  METAL: 'metal',     // mountain, needs Mining
  FISH: 'fish',       // water
  WHALE: 'whale',     // ocean
};

export const BUILDING = {
  PORT: 'port',
  FARM: 'farm',
  MINE: 'mine',
  LUMBER_HUT: 'lumber_hut',
  SAWMILL: 'sawmill',
  WINDMILL: 'windmill',
  FORGE: 'forge',
  TEMPLE: 'temple',
  MARKET: 'market',
};

export const LAND = [TERRAIN.FIELD, TERRAIN.FOREST, TERRAIN.MOUNTAIN];
export const SEA = [TERRAIN.WATER, TERRAIN.OCEAN];
export const isLand = (t) => LAND.includes(t);
export const isSea = (t) => SEA.includes(t);

// --- combat ---------------------------------------------------------------
export const COMBAT = {
  DAMAGE_SCALE: 4.5,      // the "* 4.5" in the Polytopia damage formula
  VETERAN_KILLS: 3,
  VETERAN_HP_BONUS: 5,
  HEAL_IN_TERRITORY: 4,
  HEAL_OUTSIDE: 2,
};

// Defence multipliers. Faithful to Polytopia: forest gives NO defence bonus.
export const DEFENSE_BONUS = {
  NONE: 1.0,
  MOUNTAIN: 1.5,
  CITY: 1.5,        // "fortified" - any unit standing in a friendly city
  CITY_WALLS: 4.0,
  DRENCHED: 0.5,    // unit that just disembarked / is on water without a vessel
};

// --- economy --------------------------------------------------------------
export const ECONOMY = {
  START_STARS: 5,
  CAPITAL_START_LEVEL: 1,
  // population needed to reach level N from N-1
  popForLevel: (level) => level + 1,
  // stars per turn contributed by a city of this level
  incomeForLevel: (level) => level,
};

export const SCORE = {
  TECH_TIER: [0, 100, 200, 300],
  CITY_LEVEL: 5,
  UNIT: 5,
  TILE_EXPLORED: 5,
  BUILDING: 20,
};
