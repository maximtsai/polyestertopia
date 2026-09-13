import * as THREE from 'three';

const WOOD = 0x805337, DARK = 0x303b48, STEEL = 0xc6d6df, SKIN = 0xf3c16b;

/** Shared low-poly miniatures used by both the board and the model gallery. */
export function buildUnitMesh(unit, palette) {
  const g = new THREE.Group();
  const p = palette.primary, s = palette.secondary, a = palette.accent;
  const materials = new Map();
  const put = (geometry, color, x=0, y=0, z=0) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading:true }));
    const m = new THREE.Mesh(geometry, materials.get(color));
    m.position.set(x,y,z); g.add(m); return m;
  };
  const box = (w,h,d,c,x,y,z) => put(new THREE.BoxGeometry(w,h,d),c,x,y,z);
  const cone = (r,h,c,x,y,z,n=6) => put(new THREE.ConeGeometry(r,h,n),c,x,y,z);
  const cylinder = (r,h,c,x,y,z,n=8) => put(new THREE.CylinderGeometry(r,r,h,n),c,x,y,z);
  const beam = (from,to,width,color) => {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const m = box(width,start.distanceTo(end),width,color);
    m.position.copy(start).add(end).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
    return m;
  };
  const face = (y, size=.23) => {
    box(size,size*.85,size*.85,SKIN,0,y,0);
    for (const x of [-1,1]) {
      box(size*.2,size*.29,.012,0xfff6df,x*size*.23,y+.01,size*.435);
      box(size*.085,size*.23,.018,DARK,x*size*.23+.008,y+.006,size*.46);
    }
  };
  const helmet = (y, heavy=false) => {
    box(.27,.07,.25,heavy ? STEEL : s,0,y+.1,0);
    cone(.175,.14,heavy ? STEEL : p,0,y+.19,0,4).rotation.y=Math.PI/4;
    if(heavy) for(const x of [-.125,.125]) box(.045,.13,.18,STEEL,x,y+.015,-.015);
  };
  const person = (heavy=false, base=0) => {
    for(const x of [-.085,.085]) {
      box(.105,.14,.12,DARK,x,base+.08,0);
      box(.115,.06,.17,WOOD,x,base+.035,.025);
    }
    box(.27,.25,.2,p,0,base+.265,0);
    box(.28,.045,.215,WOOD,0,base+.19,0);
    box(.06,.05,.025,a,0,base+.19,.12);
    for(const x of [-.18,.18]) {
      box(.09,.19,.13,heavy ? STEEL : s,x,base+.29,0);
      box(.08,.075,.09,SKIN,x,base+.18,.025);
    }
    if(heavy) box(.2,.12,.025,STEEL,0,base+.33,.112);
    face(base+.49); helmet(base+.49,heavy);
  };
  const sword = (x,y,z) => {
    box(.045,.34,.035,STEEL,x,y,z);
    cone(.036,.1,STEEL,x,y+.22,z,4);
    box(.16,.035,.055,a,x,y-.18,z);
    box(.035,.11,.035,WOOD,x,y-.25,z);
  };
  const shield = (x,y,z,large=false) => {
    const w=large ? .32 : .2, h=large ? .4 : .24;
    box(w,h,.07,STEEL,x,y,z);
    box(w-.045,h-.045,.025,p,x,y,z+.048);
    box(.035,h-.085,.025,a,x,y,z+.07);
    box(w-.085,.035,.025,a,x,y+.025,z+.07);
  };
  const horse = (armored) => {
    const coat = armored ? 0x6a747c : 0xa57447;
    box(.3,.24,.48,coat,0,.3,0);
    for(const x of [-.11,.11]) for(const z of [-.17,.17]) {
      box(.065,.22,.07,coat,x,.13,z);
      box(.075,.055,.09,DARK,x,.035,z+.01);
    }
    box(.17,.32,.18,coat,0,.46,.21).rotation.x=-.3;
    box(.18,.16,.24,coat,0,.62,.29);
    box(.18,.06,.08,DARK,0,.59,.4);
    for(const x of [-.06,.06]) { cone(.035,.1,coat,x,.75,.23,4); box(.013,.035,.035,0x171c25,x*1.6,.655,.32); }
    box(.055,.22,.055,DARK,0,.51,.12);
    beam([0,.36,-.23],[0,.13,-.34],.06,DARK);
    box(.34,.055,.26,p,0,.435,-.035);
    box(.2,.07,.19,WOOD,0,.48,-.035);
    if(armored) box(.32,.2,.06,STEEL,0,.32,.255);
    box(.2,.19,.16,p,0,.59,-.035); face(.79,.2); helmet(.79,armored);
    for(const x of [-.19,.19]) box(.07,.2,.09,DARK,x,.43,-.02);
    beam([-.13,.63,.01],[-.12,.59,.27],.035,WOOD);
  };

  switch(unit.type) {
    case 'warrior':
      person();
      beam([.22,.18,.08],[.29,.61,.09],.055,WOOD);
      box(.12,.17,.11,WOOD,.29,.6,.09).rotation.z=-.16;
      box(.13,.035,.12,STEEL,.28,.55,.09);
      shield(-.21,.29,.13);
      break;
    case 'archer':
      person();
      box(.12,.28,.12,WOOD,-.07,.32,-.16).rotation.z=-.2;
      for(const x of [-.1,-.055]) { beam([x,.35,-.17],[x,.6,-.17],.015,WOOD); box(.04,.06,.016,a,x,.57,-.17); }
      // Bow and taut string share a vertical plane, readable from the board camera.
      put(new THREE.TorusGeometry(.21,.022,4,12,Math.PI),WOOD,.22,.35,.13).rotation.z=-Math.PI/2;
      beam([.22,.14,.13],[.22,.56,.13],.008,0xefe6cf);
      beam([.14,.35,.13],[.48,.35,.13],.014,WOOD);
      cone(.035,.085,STEEL,.5,.35,.13,4).rotation.z=-Math.PI/2;
      break;
    case 'defender': person(true); shield(-.13,.28,.21,true); box(.28,.06,.26,s,0,.61,0); break;
    case 'swordsman': person(true); sword(.25,.48,.1); shield(-.23,.3,.15); break;
    case 'rider': horse(false); beam([.22,.42,0],[.22,.84,.3],.03,WOOD); break;
    case 'knight':
      horse(true); cone(.075,.18,s,0,1.07,0,5);
      beam([.24,.36,-.13],[.24,.96,.36],.025,WOOD);
      cone(.045,.14,STEEL,.24,1.01,.4,4).rotation.x=.68;
      box(.015,.12,.18,p,.24,.84,.27); shield(-.2,.61,.1); break;
    case 'mindbender':
      cone(.22,.42,p,0,.24,0,8); face(.51);
      cone(.18,.28,s,0,.7,-.02,6);
      box(.065,.3,.025,a,0,.3,.14);
      beam([.15,.4,0],[.27,.38,.06],.07,s);
      beam([.28,.06,.06],[.28,.65,.06],.035,WOOD);
      put(new THREE.OctahedronGeometry(.09),0x8deaff,.28,.73,.06);
      put(new THREE.TorusGeometry(.115,.018,4,12),a,.28,.73,.06);
      break;
    case 'giant':
      for(const x of [-.16,.16]) { box(.18,.24,.21,DARK,x,.14,0); box(.2,.08,.26,WOOD,x,.045,.02); }
      box(.48,.4,.31,p,0,.46,0); box(.49,.07,.33,WOOD,0,.32,0);
      for(const x of [-.34,.34]) { box(.19,.22,.28,STEEL,x,.59,0); box(.16,.25,.18,SKIN,x,.39,0); box(.19,.13,.2,WOOD,x,.23,.025); }
      face(.84,.34); box(.39,.09,.34,s,0,1,0);
      for(const x of [-.14,0,.14]) cone(.055,.13,a,x,1.1,0,4);
      box(.12,.15,.03,a,0,.51,.17); break;
    case 'catapult': {
      box(.49,.09,.5,WOOD,0,.18,0);
      for(const x of [-.27,.27]) for(const z of [-.17,.17]) {
        cylinder(.115,.065,DARK,x,.12,z).rotation.z=Math.PI/2;
        cylinder(.045,.072,a,x,.12,z).rotation.z=Math.PI/2;
      }
      for(const x of [-.17,.17]) { beam([x,.2,-.19],[x,.53,0],.065,WOOD); beam([x,.2,.19],[x,.53,0],.065,WOOD); }
      beam([-.23,.49,0],[.23,.49,0],.07,STEEL);
      beam([0,.27,.23],[0,.74,-.23],.065,WOOD);
      box(.2,.07,.18,WOOD,0,.74,-.23);
      put(new THREE.IcosahedronGeometry(.1,0),0x717b85,0,.83,-.23);
      box(.28,.075,.03,p,0,.24,.26); break;
    }
    case 'raft':
      for(const x of [-.24,-.12,0,.12,.24]) { cylinder(.065,.65,WOOD,x,.08,0).rotation.x=Math.PI/2; }
      for(const z of [-.2,.2]) box(.62,.03,.035,a,0,.145,z);
      box(.22,.12,.22,p,0,.22,0);
      beam([.32,.17,-.25],[.36,.08,.3],.025,WOOD); box(.1,.025,.16,WOOD,.36,.08,.3); break;
    case 'scout': case 'rammer': case 'bomber': {
      // Tapered six-sided hull with a flat deck and raised gunwales.
      const shape = new THREE.Shape(); shape.moveTo(-.25,-.3); shape.lineTo(.25,-.3); shape.lineTo(.29,.14); shape.lineTo(0,.44); shape.lineTo(-.29,.14); shape.closePath();
      const hull = put(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false}),WOOD,0,.19,0); hull.rotation.x=Math.PI/2;
      box(.43,.035,.5,0xb88954,0,.2,-.04);
      for(const x of [-.25,.25]) box(.04,.1,.43,p,x,.24,-.07);
      if(unit.type !== 'bomber') {
        beam([0,.2,-.03],[0,.88,-.03],.035,WOOD);
        box(.44,.035,.035,WOOD,0,.82,-.03);
        box(.4,.37,.025,s,0,.61,-.025);
        box(.065,.24,.032,a,0,.61,-.025);
        cone(.07,.1,p,0,.94,-.03,4);
      }
      if(unit.type === 'rammer') {
        cone(.115,.3,STEEL,0,.16,.46,4).rotation.x=Math.PI/2;
        for(const x of [-.27,.27]) for(const z of [-.18,.05]) shield(x,.29,z);
      }
      if(unit.type === 'scout') { box(.19,.13,.15,p,0,.28,-.21); }
      if(unit.type === 'bomber') {
        cylinder(.17,.12,DARK,0,.29,.03);
        const barrel = cylinder(.09,.35,DARK,0,.43,.12); barrel.rotation.x=.85;
        const muzzle = cylinder(.066,.012,0x111923,0,.55,.253); muzzle.rotation.x=.85;
        for(const x of [-.15,.15]) put(new THREE.IcosahedronGeometry(.065,0),DARK,x,.27,-.2);
        beam([-.2,.23,-.22],[-.2,.72,-.22],.025,WOOD);
        box(.18,.12,.015,p,-.11,.64,-.22);
      }
      break;
    }
    default: person();
  }
  // Keep health indicators above each silhouette, including lances and masts.
  const top = new THREE.Box3().setFromObject(g).max.y;
  const health = makeHealthBar(); health.position.y = Math.max(0,top+.12-.78);
  g.add(health);
  g.userData.unitId = unit.id;
  return g;
}
function makeHealthBar() {
  const group = new THREE.Group();
  group.name = 'hpbar';
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1d21, depthTest: false }));
  bg.center.set(0, 0.5); bg.scale.set(0.6, 0.09, 1); bg.position.set(-0.3, 0.78, 0);
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x5fd36a, depthTest: false }));
  fill.center.set(0, 0.5); fill.scale.set(0.58, 0.07, 1); fill.position.set(-0.29, 0.78, 0.01);
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

}
