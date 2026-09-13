import * as THREE from 'three';
import { TERRAIN, BUILDING, RESOURCE } from '../core/constants.js';

export const TILE = 1;
export const HEIGHTS = {
  [TERRAIN.FIELD]: 0.3,
  [TERRAIN.FOREST]: 0.3,
  [TERRAIN.MOUNTAIN]: 0.85,
  [TERRAIN.WATER]: 0.12,
  [TERRAIN.OCEAN]: 0.06,
};
const COLORS = {
  [TERRAIN.FIELD]: 0x7fb257,
  [TERRAIN.FOREST]: 0x3e7d47,
  [TERRAIN.MOUNTAIN]: 0x8d9199,
  [TERRAIN.WATER]: 0x3d8fd1,
  [TERRAIN.OCEAN]: 0x1f5c96,
};
const FOG_COLOR = 0x1b2228;

const box = (w, h, d, color) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

/** Build every tile mesh once. Positions never change; only colours and decor do. */
export function buildTerrain(state, scene) {
  const group = new THREE.Group();
  const pickTargets = [];
  const tileViews = new Map();

  for (const tile of state.map.tiles) {
    const h = HEIGHTS[tile.terrain];
    const mesh = box(TILE * 0.98, h, TILE * 0.98, COLORS[tile.terrain]);
    mesh.position.set(tile.x, h / 2, tile.y);
    mesh.userData.tile = { x: tile.x, y: tile.y };
    group.add(mesh);
    pickTargets.push(mesh);

    const decor = new THREE.Group();
    decor.position.set(tile.x, h, tile.y);
    group.add(decor);

    tileViews.set(key(tile), { mesh, decor, base: COLORS[tile.terrain] });
    addDecor(tile, decor);
  }
  scene.add(group);
  return { group, pickTargets, tileViews };
}

function key(t) { return `${t.x},${t.y}`; }

function addDecor(tile, decor) {
  decor.clear();
  if (tile.terrain === TERRAIN.FOREST) {
    const trunk = box(0.12, 0.22, 0.12, 0x5a3b22);
    trunk.position.y = 0.11;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0x2f6b39 }));
    crown.position.y = 0.48;
    decor.add(trunk, crown);
  }
  if (tile.terrain === TERRAIN.MOUNTAIN) {
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.7, 4),
      new THREE.MeshLambertMaterial({ color: 0xb9bec6 }));
    peak.position.y = 0.35;
    peak.rotation.y = Math.PI / 4;
    decor.add(peak);
  }
  if (tile.resource) decor.add(resourceMesh(tile.resource));
  if (tile.building) decor.add(buildingMesh(tile.building));
}

function resourceMesh(res) {
  const g = new THREE.Group();
  const colors = {
    [RESOURCE.FRUIT]: 0xd6453f, [RESOURCE.CROP]: 0xe3c04a, [RESOURCE.GAME]: 0x8b5a2b,
    [RESOURCE.METAL]: 0xc9d1d9, [RESOURCE.FISH]: 0x9fe3ff, [RESOURCE.WHALE]: 0x4b6fa5,
  };
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    new THREE.MeshLambertMaterial({ color: colors[res] || 0xffffff }));
  m.position.set(0.3, 0.14, 0.3);
  g.add(m);
  return g;
}

function buildingMesh(building) {
  const g = new THREE.Group();
  const color = building === BUILDING.PORT ? 0xa9743f : 0xcfc2a1;
  const b = box(0.34, 0.24, 0.34, color);
  b.position.set(-0.25, 0.12, -0.25);
  g.add(b);
  return g;
}

/** City centre: a small keep, plus a wall ring when the city has walls. */
export function cityMesh(city, palette) {
  const g = new THREE.Group();
  const keep = box(0.5, 0.34 + city.level * 0.08, 0.5, palette.primary);
  keep.position.y = (0.34 + city.level * 0.08) / 2;
  g.add(keep);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 0.3, 4),
    new THREE.MeshLambertMaterial({ color: palette.secondary }));
  roof.position.y = 0.34 + city.level * 0.08 + 0.15;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  if (city.walls) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.06, 4, 4),
      new THREE.MeshLambertMaterial({ color: 0xd8d3c4 }));
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI / 4;
    ring.position.y = 0.14;
    g.add(ring);
  }
  return g;
}

export function refreshTile(state, tileViews, tile) {
  const view = tileViews.get(key(tile));
  if (view) addDecor(tile, view.decor);
}

export { COLORS, FOG_COLOR, key as tileKey };
