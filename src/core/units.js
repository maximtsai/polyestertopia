// Unit stat table, seeded from current Polytopia values.
// cost: stars. mov: movement points. rng: attack range (Chebyshev).
// Naval vessels carry a land unit; their HP is the carried unit's HP.

export const SKILL = {
  DASH: 'dash',           // may move and then attack in the same turn
  FORTIFY: 'fortify',     // gains the city defence bonus
  ESCAPE: 'escape',       // may attack and then move
  PERSIST: 'persist',     // may attack again after a kill
  STIFF: 'stiff',         // takes no retaliation damage... and deals none
  SPLASH: 'splash',       // damages units adjacent to the target
  HEAL: 'heal',           // can heal adjacent friendly units
  CONVERT: 'convert',     // can convert an adjacent enemy unit
  SCOUT: 'scout',         // larger vision radius
  CARRY: 'carry',         // naval: transports a land unit
  STATIC: 'static',       // no dash, no fortify (superunits)
  INDEPENDENT: 'independent', // does not belong to a city's unit count
};

export const UNITS = {
  warrior:    { name: 'Warrior',    cost: 2,  maxHp: 10, atk: 2,   def: 2, mov: 1, rng: 1, skills: [SKILL.DASH, SKILL.FORTIFY] },
  archer:     { name: 'Archer',     cost: 3,  maxHp: 10, atk: 2,   def: 1, mov: 1, rng: 2, skills: [SKILL.DASH, SKILL.FORTIFY] },
  defender:   { name: 'Defender',   cost: 3,  maxHp: 15, atk: 1,   def: 3, mov: 1, rng: 1, skills: [SKILL.FORTIFY] },
  rider:      { name: 'Rider',      cost: 3,  maxHp: 10, atk: 2,   def: 1, mov: 2, rng: 1, skills: [SKILL.DASH, SKILL.ESCAPE] },
  swordsman:  { name: 'Swordsman',  cost: 5,  maxHp: 15, atk: 3,   def: 3, mov: 1, rng: 1, skills: [SKILL.DASH, SKILL.FORTIFY] },
  catapult:   { name: 'Catapult',   cost: 8,  maxHp: 10, atk: 4,   def: 0, mov: 1, rng: 3, skills: [SKILL.STIFF] },
  knight:     { name: 'Knight',     cost: 8,  maxHp: 10, atk: 3.5, def: 1, mov: 3, rng: 1, skills: [SKILL.DASH, SKILL.PERSIST, SKILL.FORTIFY] },
  mindbender: { name: 'Mind Bender',cost: 5,  maxHp: 10, atk: 0,   def: 1, mov: 1, rng: 1, skills: [SKILL.HEAL, SKILL.CONVERT] },
  giant:      { name: 'Giant',      cost: 0,  maxHp: 40, atk: 5,   def: 4, mov: 1, rng: 1, skills: [SKILL.STATIC], super: true },

  // --- naval (modern carrier system) --------------------------------------
  raft:       { name: 'Raft',       cost: 0,  atk: 0,   def: 1, mov: 2, rng: 1, naval: true, skills: [SKILL.CARRY] },
  scout:      { name: 'Scout',      cost: 5,  atk: 2,   def: 1, mov: 3, rng: 2, naval: true, skills: [SKILL.CARRY, SKILL.DASH, SKILL.SCOUT] },
  rammer:     { name: 'Rammer',     cost: 5,  atk: 3,   def: 2, mov: 3, rng: 1, naval: true, skills: [SKILL.CARRY, SKILL.DASH] },
  bomber:     { name: 'Bomber',     cost: 15, atk: 4,   def: 1, mov: 2, rng: 3, naval: true, skills: [SKILL.CARRY, SKILL.SPLASH, SKILL.STIFF] },
};

export const NAVAL_TIERS = ['raft', 'scout', 'rammer', 'bomber'];
export const NAVAL_UPGRADES = { raft: ['scout', 'rammer'], scout: ['bomber'], rammer: ['bomber'] };

export const isNaval = (type) => !!UNITS[type].naval;
export const hasSkill = (type, skill) => UNITS[type].skills.includes(skill);

/** Effective stats of a unit instance, accounting for naval carrying and veteran status. */
export function statsOf(unit) {
  const base = UNITS[unit.type];
  const maxHp = unit.maxHp; // instances carry their own maxHp (veteran, carried unit)
  return { ...base, maxHp };
}
