/**
 * Tiny synchronous event bus. The rules engine emits; the renderer and UI listen.
 * Events are plain data so they can be logged, replayed, or ignored entirely
 * (the headless simulator attaches no listeners).
 */
export function makeEmitter() {
  const listeners = [];
  return {
    on(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    emit(type, payload = {}) {
      const ev = { type, ...payload };
      for (const fn of listeners.slice()) fn(ev);
      return ev;
    },
  };
}

export const EV = {
  UNIT_MOVED: 'unit_moved',
  UNIT_ATTACKED: 'unit_attacked',
  UNIT_DIED: 'unit_died',
  UNIT_SPAWNED: 'unit_spawned',
  UNIT_HEALED: 'unit_healed',
  UNIT_PROMOTED: 'unit_promoted',
  UNIT_BOARDED: 'unit_boarded',
  UNIT_DISEMBARKED: 'unit_disembarked',
  CITY_CAPTURED: 'city_captured',
  CITY_LEVELED: 'city_leveled',
  TILE_CLAIMED: 'tile_claimed',
  BUILDING_BUILT: 'building_built',
  TECH_RESEARCHED: 'tech_researched',
  TURN_STARTED: 'turn_started',
  TURN_ENDED: 'turn_ended',
  GAME_OVER: 'game_over',
  RUIN_OPENED: 'ruin_opened',
};
