import { COMBAT, DEFENSE_BONUS, TERRAIN } from './constants.js';
import { SKILL, UNITS, hasSkill } from './units.js';

/**
 * The Polytopia damage formula. Fully deterministic - no RNG anywhere.
 * Returns integer damage for both sides before any skill filtering.
 */
export function computeDamage({ atk, hp, maxHp }, { def, hp: dHp, maxHp: dMaxHp }, defenseBonus) {
  const attackForce = atk * (hp / maxHp);
  const defenseForce = def * (dHp / dMaxHp) * defenseBonus;
  const total = attackForce + defenseForce;
  if (total === 0) return { attackDamage: 0, defenseDamage: 0 };
  return {
    attackDamage: Math.round((attackForce / total) * atk * COMBAT.DAMAGE_SCALE),
    defenseDamage: Math.round((defenseForce / total) * def * COMBAT.DAMAGE_SCALE),
  };
}

/** Defence multiplier for a unit standing on a tile. */
export function defenseBonusFor(state, unit) {
  const tile = state.tileAt(unit.x, unit.y);
  if (tile.city && tile.city.owner === unit.owner) {
    return tile.city.walls ? DEFENSE_BONUS.CITY_WALLS : DEFENSE_BONUS.CITY;
  }
  if (unit.drenched) return DEFENSE_BONUS.DRENCHED;
  if (tile.terrain === TERRAIN.MOUNTAIN) return DEFENSE_BONUS.MOUNTAIN;
  return DEFENSE_BONUS.NONE;
}

/**
 * Full preview of an attack: what both sides lose, and whether anyone dies.
 * Pure - takes state but never mutates it. The UI uses this for damage preview
 * and the AI uses the exact same function to score attacks.
 */
export function previewAttack(state, attacker, defender) {
  const aStats = { atk: UNITS[attacker.type].atk, hp: attacker.hp, maxHp: attacker.maxHp };
  const dStats = { def: UNITS[defender.type].def, hp: defender.hp, maxHp: defender.maxHp };
  const bonus = defenseBonusFor(state, defender);
  let { attackDamage, defenseDamage } = computeDamage(aStats, dStats, bonus);

  const defenderDies = defender.hp - attackDamage <= 0;
  const inMeleeRange = chebyshev(attacker, defender) <= 1;
  const retaliates =
    !defenderDies &&
    inMeleeRange &&
    !hasSkill(attacker.type, SKILL.STIFF) &&
    UNITS[defender.type].atk > 0;

  if (!retaliates) defenseDamage = 0;

  return {
    attackDamage,
    defenseDamage,
    defenderDies,
    attackerDies: attacker.hp - defenseDamage <= 0,
    defenseBonus: bonus,
  };
}

export function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
