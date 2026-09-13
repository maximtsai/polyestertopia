import { TERRAIN, BUILDING, isSea } from './constants.js';
import { UNITS, NAVAL_UPGRADES } from './units.js';
import { EV } from './events.js';
import { unlocksOf } from './tech.js';

/**
 * Modern (post-2022) carrier system. A land unit that steps into water from a
 * port becomes a vessel that CARRIES it; the land unit is never destroyed and
 * reappears intact on disembark. Vessel HP is the carried unit's HP.
 */

export function isVessel(unit) { return !!UNITS[unit.type].naval; }

export function hasPort(state, x, y) {
  const t = state.tileAt(x, y);
  return !!t && t.building === BUILDING.PORT;
}

export function canTraverse(state, unit, tile, player) {
  const unlocked = unlocksOf(player);
  if (!isSea(tile.terrain)) return false;
  if (tile.terrain === TERRAIN.OCEAN) return unlocked.has('move:ocean');
  return unlocked.has('move:water');
}

export function board(state, unit) {
  if (isVessel(unit)) return;
  unit.carrying = { type: unit.type, kills: unit.kills, veteran: unit.veteran };
  unit.type = 'raft';
  state.events.emit(EV.UNIT_BOARDED, { unit });
}

export function disembark(state, unit) {
  if (!unit.carrying) return;
  const { type, kills, veteran } = unit.carrying;
  unit.type = type;
  unit.kills = kills;
  unit.veteran = veteran;
  unit.carrying = null;
  unit.drenched = false;
  state.events.emit(EV.UNIT_DISEMBARKED, { unit });
}

/** Which vessel tiers this unit may pay to upgrade into. */
export function upgradeOptions(state, unit, player) {
  if (!isVessel(unit)) return [];
  const unlocked = unlocksOf(player);
  return (NAVAL_UPGRADES[unit.type] || []).filter((t) => unlocked.has(`unit:${t}`));
}

export function upgradeVessel(state, unit, toType) {
  unit.type = toType;
  unit.moved = true;
  unit.attacked = true;
}
