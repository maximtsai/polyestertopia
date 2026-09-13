import { UNITS } from './units.js';

// 3 tiers, 25 techs. `req` is the prerequisite tech id (null for tier 1).
export const TECHS = {
  climbing:    { name: 'Climbing',     tier: 1, req: null,        unlocks: ['move:mountain'] },
  fishing:     { name: 'Fishing',      tier: 1, req: null,        unlocks: ['harvest:fish'] },
  hunting:     { name: 'Hunting',      tier: 1, req: null,        unlocks: ['harvest:game'] },
  organization:{ name: 'Organization', tier: 1, req: null,        unlocks: ['harvest:fruit'] },
  riding:      { name: 'Riding',       tier: 1, req: null,        unlocks: ['unit:rider'] },

  mining:      { name: 'Mining',       tier: 2, req: 'climbing',   unlocks: ['build:mine'] },
  meditation:  { name: 'Meditation',   tier: 2, req: 'climbing',   unlocks: ['build:temple'] },
  sailing:     { name: 'Sailing',      tier: 2, req: 'fishing',    unlocks: ['build:port', 'move:water'] },
  aquatism:    { name: 'Aquatism',     tier: 2, req: 'fishing',    unlocks: ['unit:rammer'] },
  archery:     { name: 'Archery',      tier: 2, req: 'hunting',    unlocks: ['unit:archer'] },
  forestry:    { name: 'Forestry',     tier: 2, req: 'hunting',    unlocks: ['build:lumber_hut'] },
  farming:     { name: 'Farming',      tier: 2, req: 'organization',unlocks: ['build:farm'] },
  strategy:    { name: 'Strategy',     tier: 2, req: 'organization',unlocks: ['unit:defender'] },
  roads:       { name: 'Roads',        tier: 2, req: 'riding',     unlocks: ['build:road'] },
  freespirit:  { name: 'Free Spirit',  tier: 2, req: 'riding',     unlocks: ['action:burn_forest'] },

  smithery:    { name: 'Smithery',     tier: 3, req: 'mining',     unlocks: ['unit:swordsman', 'build:forge'] },
  philosophy:  { name: 'Philosophy',   tier: 3, req: 'meditation', unlocks: ['unit:mindbender'] },
  navigation:  { name: 'Navigation',   tier: 3, req: 'sailing',    unlocks: ['unit:bomber', 'move:ocean'] },
  aquaculture: { name: 'Aquaculture',  tier: 3, req: 'aquatism',   unlocks: ['unit:scout', 'harvest:whale'] },
  spiritualism:{ name: 'Spiritualism', tier: 3, req: 'archery',    unlocks: ['build:forest_temple'] },
  mathematics: { name: 'Mathematics',  tier: 3, req: 'forestry',   unlocks: ['unit:catapult', 'build:sawmill'] },
  construction:{ name: 'Construction', tier: 3, req: 'farming',    unlocks: ['build:windmill'] },
  diplomacy:   { name: 'Diplomacy',    tier: 3, req: 'strategy',   unlocks: ['vision:capital'] },
  trade:       { name: 'Trade',        tier: 3, req: 'roads',      unlocks: ['build:market'] },
  chivalry:    { name: 'Chivalry',     tier: 3, req: 'freespirit', unlocks: ['unit:knight'] },
};

/**
 * Single source of truth for tech pricing. Cost rises with the number of cities,
 * which is what creates the wide-vs-tall tension.
 */
export function techCost(tier, cityCount) {
  return tier * (cityCount + 4) - (tier - 1) * 2;
}

export function canResearch(player, techId) {
  const t = TECHS[techId];
  if (!t || player.techs.includes(techId)) return false;
  return t.req === null || player.techs.includes(t.req);
}

/** All unlock strings the player currently has. */
export function unlocksOf(player) {
  const set = new Set();
  for (const id of player.techs) for (const u of TECHS[id].unlocks) set.add(u);
  return set;
}

export function unitsAvailable(player) {
  const unlocked = unlocksOf(player);
  const base = ['warrior'];
  for (const key of Object.keys(UNITS)) {
    if (UNITS[key].super || UNITS[key].naval) continue;
    if (unlocked.has(`unit:${key}`)) base.push(key);
  }
  return base;
}
