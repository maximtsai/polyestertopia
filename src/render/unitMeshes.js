import * as THREE from 'three';
import { UNITS } from '../core/units.js';

const lam = (color) => new THREE.MeshLambertMaterial({ color });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
const cyl = (r, h, c, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), lam(c));
const cone = (r, h, c, seg = 6) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), lam(c));
const sph = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), lam(c));

/**
 * Procedural low-poly units. No external assets: each type gets a distinct
 * silhouette (height, width, headgear) so it stays readable at this camera
 * angle even before any art pass.
 */
export function buildUnitMesh(unit, palette) {
  const g = new THREE.Group();
  const p = palette.primary, s = palette.secondary, a = palette.accent;
  const body = (w, h, d, c = p) => { const m = box(w, h, d, c); m.position.y = h / 2; g.add(m); return m; };

  switch (unit.type) {
    case 'warrior': {
      body(0.3, 0.4, 0.24);
      const head = sph(0.13, a); head.position.y = 0.52; g.add(head);
      const club = box(0.07, 0.3, 0.07, s); club.position.set(0.2, 0.4, 0); g.add(club);
      break;
    }
    case 'archer': {
      body(0.24, 0.42, 0.2);
      const head = sph(0.12, a); head.position.y = 0.54; g.add(head);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 4, 8, Math.PI), lam(s));
      bow.position.set(0.18, 0.36, 0); bow.rotation.y = Math.PI / 2; g.add(bow);
      break;
    }
    case 'defender': {
      body(0.42, 0.36, 0.3);
      const head = sph(0.12, a); head.position.y = 0.48; g.add(head);
      const shield = box(0.08, 0.34, 0.3, s); shield.position.set(-0.24, 0.3, 0); g.add(shield);
      break;
    }
    case 'rider': {
      const mount = box(0.42, 0.22, 0.22, s); mount.position.y = 0.14; g.add(mount);
      const rider = box(0.2, 0.3, 0.18, p); rider.position.y = 0.4; g.add(rider);
      const head = sph(0.11, a); head.position.y = 0.6; g.add(head);
      break;
    }
    case 'swordsman': {
      body(0.34, 0.44, 0.26);
      const head = sph(0.13, a); head.position.y = 0.56; g.add(head);
      const blade = box(0.05, 0.46, 0.05, 0xdfe6ee); blade.position.set(0.22, 0.48, 0); g.add(blade);
      break;
    }
    case 'catapult': {
      const base = box(0.46, 0.16, 0.36, 0x6b5533); base.position.y = 0.08; g.add(base);
      const arm = box(0.06, 0.44, 0.06, s); arm.position.set(0, 0.34, 0); arm.rotation.z = -0.7; g.add(arm);
      const ball = sph(0.1, 0.4 && 0x555a60); ball.position.set(-0.24, 0.5, 0); g.add(ball);
      break;
    }
    case 'knight': {
      const mount = box(0.46, 0.24, 0.24, s); mount.position.y = 0.15; g.add(mount);
      const rider = box(0.22, 0.34, 0.2, p); rider.position.y = 0.46; g.add(rider);
      const plume = cone(0.1, 0.24, a); plume.position.y = 0.72; g.add(plume);
      const lance = box(0.04, 0.5, 0.04, 0xdfe6ee);
      lance.position.set(0.26, 0.5, 0); lance.rotation.z = -0.35; g.add(lance);
      break;
    }
    case 'mindbender': {
      const robe = cone(0.2, 0.5, p); robe.position.y = 0.25; g.add(robe);
      const head = sph(0.12, a); head.position.y = 0.56; g.add(head);
      const orb = sph(0.09, 0x9fe3ff); orb.position.set(0.2, 0.42, 0); g.add(orb);
      break;
    }
    case 'giant': {
      body(0.5, 0.72, 0.4);
      const head = sph(0.2, a); head.position.y = 0.9; g.add(head);
      const armL = box(0.14, 0.5, 0.14, p); armL.position.set(-0.32, 0.5, 0); g.add(armL);
      const armR = box(0.14, 0.5, 0.14, p); armR.position.set(0.32, 0.5, 0); g.add(armR);
      break;
    }
    // --- naval ------------------------------------------------------------
    case 'raft': case 'scout': case 'rammer': case 'bomber': {
      const hull = box(0.62, 0.14, 0.34, 0x8a6237); hull.position.y = 0.07; g.add(hull);
      if (unit.type !== 'raft') {
        const mast = box(0.05, 0.4, 0.05, 0x6b4b28); mast.position.y = 0.3; g.add(mast);
        const sail = box(0.02, 0.28, 0.26, s); sail.position.set(0.03, 0.34, 0); g.add(sail);
      }
      if (unit.type === 'rammer') {
        const ram = cone(0.09, 0.24, 0xb0b6bd); ram.position.set(0.36, 0.1, 0); ram.rotation.z = -Math.PI / 2; g.add(ram);
      }
      if (unit.type === 'bomber') {
        const pot = sph(0.12, 0x3a3f45); pot.position.set(-0.2, 0.2, 0); g.add(pot);
      }
      break;
    }
    default: body(0.3, 0.4, 0.24);
  }

  g.add(makeHealthBar());
  g.userData.unitId = unit.id;
  return g;
}

function makeHealthBar() {
  const group = new THREE.Group();
  group.name = 'hpbar';
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1d21, depthTest: false }));
  bg.center.set(0, 0.5); bg.scale.set(0.6, 0.09, 1); bg.position.set(-0.3, 1.0, 0);
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x5fd36a, depthTest: false }));
  fill.center.set(0, 0.5); fill.scale.set(0.58, 0.07, 1); fill.position.set(-0.29, 1.0, 0.01);
  fill.name = 'fill';
  group.add(bg, fill);
  group.renderOrder = 999;
  return group;
}

export function updateHealthBar(mesh, unit) {
  const bar = mesh.getObjectByName('hpbar');
  if (!bar) return;
  const fill = bar.getObjectByName('fill');
  const ratio = Math.max(0, unit.hp / unit.maxHp);
  fill.scale.x = 0.58 * ratio;
  fill.material.color.setHex(ratio > 0.6 ? 0x5fd36a : ratio > 0.3 ? 0xe0b23c : 0xd9534f);
  const base = UNITS[unit.type];
  bar.position.y = base.super ? 0.35 : 0;
}
