import { computeDamage } from '../src/core/combat.js';
import { DEFENSE_BONUS } from '../src/core/constants.js';

/**
 * Fixtures for the damage formula. These are the matchups whose numbers are
 * well known from the original game; if any of these drift, the combat model
 * is wrong and no amount of balance tuning will fix it.
 */
const CASES = [
  { name: 'Warrior vs Warrior, open ground',
    a: { atk: 2, hp: 10, maxHp: 10 }, d: { def: 2, hp: 10, maxHp: 10 },
    bonus: DEFENSE_BONUS.NONE, expect: [5, 5] },

  { name: 'Warrior vs Warrior fortified in a city',
    a: { atk: 2, hp: 10, maxHp: 10 }, d: { def: 2, hp: 10, maxHp: 10 },
    bonus: DEFENSE_BONUS.CITY, expect: [4, 5] },

  { name: 'Swordsman vs Defender, open ground',
    a: { atk: 3, hp: 15, maxHp: 15 }, d: { def: 3, hp: 15, maxHp: 15 },
    bonus: DEFENSE_BONUS.NONE, expect: [7, 7] },

  { name: 'Catapult vs Warrior (one shot kill)',
    a: { atk: 4, hp: 10, maxHp: 10 }, d: { def: 2, hp: 10, maxHp: 10 },
    bonus: DEFENSE_BONUS.NONE, expect: [12, 3] },

  { name: 'Warrior vs Defender behind walls (x4)',
    a: { atk: 2, hp: 10, maxHp: 10 }, d: { def: 3, hp: 15, maxHp: 15 },
    bonus: DEFENSE_BONUS.CITY_WALLS, expect: [1, 12] },

  { name: 'Wounded attacker deals less',
    a: { atk: 2, hp: 5, maxHp: 10 }, d: { def: 2, hp: 10, maxHp: 10 },
    bonus: DEFENSE_BONUS.NONE, expect: [3, 6] },

  { name: 'Mountain defence (x1.5) on a Warrior',
    a: { atk: 2, hp: 10, maxHp: 10 }, d: { def: 2, hp: 10, maxHp: 10 },
    bonus: DEFENSE_BONUS.MOUNTAIN, expect: [4, 5] },
];

export function runCombatChecks() {
  const results = [];
  for (const c of CASES) {
    const r = computeDamage(c.a, c.d, c.bonus);
    const got = [r.attackDamage, r.defenseDamage];
    results.push({
      name: c.name,
      pass: got[0] === c.expect[0] && got[1] === c.expect[1],
      got, expect: c.expect,
    });
  }
  return results;
}
