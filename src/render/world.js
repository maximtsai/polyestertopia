import * as THREE from 'three';
import { buildTerrain, cityMesh, refreshTile, HEIGHTS, COLORS, FOG_COLOR, tileKey } from './terrain.js';
import { buildUnitMesh, updateHealthBar } from './unitMeshes.js';
import { TERRAIN } from '../core/constants.js';
import { TRIBES } from '../campaign/tribes.js';
import { HUMAN } from '../core/game.js';

const MOVE_SPEED = 6.0; // tiles per second

/**
 * Owns every mesh in the board and reconciles it against the rules state.
 * The rules engine knows nothing about this file.
 */
export class World {
  constructor(state, ctx) {
    this.state = state;
    this.ctx = ctx;
    this.unitMeshes = new Map();  // unitId -> Group
    this.cityMeshes = new Map();  // "x,y" -> Group
    this.moving = [];
    this.palettes = {};
    for (const p of state.players) this.palettes[p.id] = TRIBES[p.tribe].colors;
  }

  build() {
    const { group, pickTargets, tileViews } = buildTerrain(this.state, this.ctx.scene);
    this.terrainGroup = group;
    this.pickTargets = pickTargets;
    this.tileViews = tileViews;

    this.overlay = new THREE.Group();
    this.ctx.scene.add(this.overlay);

    this.entities = new THREE.Group();
    this.ctx.scene.add(this.entities);

    for (const city of this.state.cities) this.addCity(city);
    this.sync();

    const w = this.state.map.width, h = this.state.map.height;
    this.ctx.focusOn((w - 1) / 2, (h - 1) / 2);
    this.ctx.setZoom(11 / Math.max(w, h) * 1.7);
  }

  addCity(city) {
    const palette = city.owner === null
      ? { primary: 0x9a9a9a, secondary: 0xc9c9c9, accent: 0xe8e8e8 }
      : this.palettes[city.owner];
    const mesh = cityMesh(city, palette);
    mesh.position.set(city.x, HEIGHTS[this.state.tileAt(city.x, city.y).terrain], city.y);
    this.entities.add(mesh);
    this.cityMeshes.set(`${city.x},${city.y}`, mesh);
  }

  rebuildCity(city) {
    const k = `${city.x},${city.y}`;
    const old = this.cityMeshes.get(k);
    if (old) { this.entities.remove(old); disposeTree(old); }
    this.cityMeshes.delete(k);
    this.addCity(city);
  }

  /** Reconcile meshes with state. Cheap enough to call after every action. */
  sync() {
    const state = this.state;

    // units
    const alive = new Set();
    for (const unit of state.units) {
      alive.add(unit.id);
      let mesh = this.unitMeshes.get(unit.id);
      if (!mesh || mesh.userData.type !== unit.type) {
        if (mesh) { this.entities.remove(mesh); disposeTree(mesh); }
        mesh = buildUnitMesh(unit, this.palettes[unit.owner]);
        mesh.userData.type = unit.type;
        mesh.position.set(unit.x, this.tileTop(unit.x, unit.y), unit.y);
        this.entities.add(mesh);
        this.unitMeshes.set(unit.id, mesh);
      }
      const target = new THREE.Vector3(unit.x, this.tileTop(unit.x, unit.y), unit.y);
      if (mesh.position.distanceTo(target) > 0.01) {
        this.moving.push({ mesh, target });
      }
      updateHealthBar(mesh, unit);
      mesh.visible = state.isExplored(HUMAN, unit.x, unit.y);
      mesh.scale.setScalar(unit.veteran ? 1.15 : 1);
    }
    for (const [id, mesh] of [...this.unitMeshes]) {
      if (!alive.has(id)) {
        this.entities.remove(mesh); disposeTree(mesh);
        this.unitMeshes.delete(id);
      }
    }

    // cities
    for (const city of state.cities) {
      const mesh = this.cityMeshes.get(`${city.x},${city.y}`);
      if (!mesh) { this.addCity(city); continue; }
      const want = `${city.owner}:${city.level}:${city.walls}`;
      if (mesh.userData.sig !== want) {
        this.rebuildCity(city);
        this.cityMeshes.get(`${city.x},${city.y}`).userData.sig = want;
      }
      const m = this.cityMeshes.get(`${city.x},${city.y}`);
      m.visible = state.isExplored(HUMAN, city.x, city.y);
    }

    // tiles: territory tint + fog
    for (const tile of state.map.tiles) {
      const view = this.tileViews.get(tileKey(tile));
      const explored = state.isExplored(HUMAN, tile.x, tile.y);
      view.decor.visible = explored;
      let color = new THREE.Color(explored ? COLORS[tile.terrain] : FOG_COLOR);
      if (explored && tile.owner !== null) {
        color.lerp(new THREE.Color(this.palettes[tile.owner].primary), 0.28);
      }
      view.mesh.material.color.copy(color);

      // Unexplored tiles are flattened as well as darkened, so terrain height
      // does not leak information through the fog.
      const h = HEIGHTS[tile.terrain];
      const shown = explored ? h : HEIGHTS[TERRAIN.FIELD];
      view.mesh.scale.y = shown / h;
      view.mesh.position.y = shown / 2;
    }
  }

  tileTop(x, y) {
    const tile = this.state.tileAt(x, y);
    return HEIGHTS[tile.terrain];
  }

  /** Coloured plates under tiles to show what the selected unit may do. */
  setHighlights({ moves = [], attacks = [], selected = null, focus = [] } = {}) {
    this.overlay.clear();
    const plate = (x, y, color, opacity = 0.55) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 0.92),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, this.tileTop(x, y) + 0.03, y);
      this.overlay.add(m);
    };
    for (const m of moves) plate(m.x, m.y, 0x6fd3ff, 0.45);
    for (const a of attacks) plate(a.x, a.y, 0xff5a4d, 0.6);
    for (const f of focus) plate(f.x, f.y, 0xffd45a, 0.35);
    if (selected) plate(selected.x, selected.y, 0xffffff, 0.35);
  }

  refreshTile(tile) { refreshTile(this.state, this.tileViews, tile); }

  update(dt) {
    if (!this.moving.length) return;
    const still = [];
    for (const m of this.moving) {
      const d = m.target.clone().sub(m.mesh.position);
      const step = MOVE_SPEED * dt;
      if (d.length() <= step) m.mesh.position.copy(m.target);
      else { m.mesh.position.add(d.normalize().multiplyScalar(step)); still.push(m); }
    }
    this.moving = still;
  }

  pickTile(event) {
    const hit = this.ctx.pick(event, this.pickTargets);
    return hit ? hit.object.userData.tile : null;
  }
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
