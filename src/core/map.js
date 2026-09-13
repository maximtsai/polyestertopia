import { TERRAIN, isLand, isSea } from './constants.js';

export const DIRS8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export function makeTile(x, y, terrain = TERRAIN.FIELD) {
  return {
    x, y, terrain,
    resource: null,
    building: null,
    city: null,        // city object if this tile is a city centre
    owner: null,       // player id owning the territory
    cityRef: null,     // {x,y} of the city that owns this tile
    road: false,
    ruin: false,
  };
}

export class GameMap {
  constructor(width, height, tiles) {
    this.width = width;
    this.height = height;
    this.tiles = tiles; // flat array, row-major
  }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  at(x, y) { return this.inBounds(x, y) ? this.tiles[y * this.width + x] : null; }
  neighbors(x, y) {
    const out = [];
    for (const [dx, dy] of DIRS8) {
      const t = this.at(x + dx, y + dy);
      if (t) out.push(t);
    }
    return out;
  }
  /** All tiles within Chebyshev radius r (excluding the centre). */
  within(x, y, r) {
    const out = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const t = this.at(x + dx, y + dy);
        if (t) out.push(t);
      }
    }
    return out;
  }
  forEach(fn) { this.tiles.forEach(fn); }
}

/**
 * Build a map from an authored character grid. One char per tile:
 *   . field   f forest   m mountain   ~ water   # ocean
 * Resources and cities are applied separately by the level definition.
 */
const CHARS = {
  '.': TERRAIN.FIELD,
  'f': TERRAIN.FOREST,
  'm': TERRAIN.MOUNTAIN,
  '~': TERRAIN.WATER,
  '#': TERRAIN.OCEAN,
};

export function mapFromRows(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const tiles = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const terrain = CHARS[ch];
      if (!terrain) throw new Error(`Unknown map char "${ch}" at ${x},${y}`);
      tiles.push(makeTile(x, y, terrain));
    }
  }
  return new GameMap(width, height, tiles);
}

export { isLand, isSea };
