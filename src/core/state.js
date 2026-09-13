import { makeEmitter } from './events.js';
import { ECONOMY } from './constants.js';
import { UNITS } from './units.js';
import { makeRng } from './rng.js';

let nextUnitId = 1;

export function makeUnit(owner, type, x, y) {
  const base = UNITS[type];
  return {
    id: nextUnitId++,
    owner, type, x, y,
    hp: base.maxHp ?? 10,
    maxHp: base.maxHp ?? 10,
    moved: false,
    attacked: false,
    kills: 0,
    veteran: false,
    carrying: null,   // {type, hp, maxHp, kills, veteran} when this is a naval vessel
    drenched: false,
    homeCity: null,
  };
}

export function makeCity(owner, x, y, { capital = false, level = 1, walls = false } = {}) {
  return {
    x, y, owner, capital,
    level,
    population: 0,
    walls,
    unitCount: 0,
    park: false,
    rewardsTaken: [],
    pendingReward: false,
  };
}

export function makePlayer(id, tribe, { isHuman = false } = {}) {
  return {
    id, tribe, isHuman,
    stars: ECONOMY.START_STARS,
    techs: [],
    score: 0,
    eliminated: false,
    explored: new Set(),   // tile indices this player has revealed
  };
}

export class GameState {
  constructor(map, players, { seed = 1, turnLimit = 30 } = {}) {
    this.map = map;
    this.players = players;
    this.units = [];
    this.cities = [];
    this.turn = 1;
    this.current = 0;      // index into players
    this.turnLimit = turnLimit;
    this.over = false;
    this.result = null;    // {won:boolean, reason:string}
    this.rng = makeRng(seed);
    this.events = makeEmitter();
    this.log = [];
  }

  // --- lookups ------------------------------------------------------------
  get player() { return this.players[this.current]; }
  tileAt(x, y) { return this.map.at(x, y); }
  index(x, y) { return y * this.map.width + x; }

  unitAt(x, y) { return this.units.find((u) => u.x === x && u.y === y) || null; }
  unitById(id) { return this.units.find((u) => u.id === id) || null; }
  unitsOf(playerId) { return this.units.filter((u) => u.owner === playerId); }
  citiesOf(playerId) { return this.cities.filter((c) => c.owner === playerId); }
  cityAt(x, y) { const t = this.tileAt(x, y); return t ? t.city : null; }

  addUnit(unit) {
    this.units.push(unit);
    this.events.emit('unit_spawned', { unit });
    return unit;
  }
  removeUnit(unit) {
    const i = this.units.indexOf(unit);
    if (i >= 0) this.units.splice(i, 1);
  }
  addCity(city) {
    this.cities.push(city);
    this.tileAt(city.x, city.y).city = city;
    return city;
  }

  // --- fog ----------------------------------------------------------------
  reveal(playerId, x, y, radius = 1) {
    const p = this.players.find((q) => q.id === playerId);
    if (!p) return;
    const tiles = [this.tileAt(x, y), ...this.map.within(x, y, radius)];
    for (const t of tiles) if (t) p.explored.add(this.index(t.x, t.y));
  }
  isExplored(playerId, x, y) {
    const p = this.players.find((q) => q.id === playerId);
    return p ? p.explored.has(this.index(x, y)) : false;
  }

  // --- misc ---------------------------------------------------------------
  isEnemy(a, b) { return a !== b; }
  note(msg) { this.log.push(`T${this.turn} P${this.player.id}: ${msg}`); }
}
