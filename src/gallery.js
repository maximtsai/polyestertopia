import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildUnitMesh } from './render/unitMeshes.js';
import { buildTribePortrait } from './render/tribePortraits.js';
import { buildTerrain, cityMesh } from './render/terrain.js';
import { UNITS } from './core/units.js';
import { TERRAIN, RESOURCE, BUILDING } from './core/constants.js';
import { TRIBES } from './campaign/tribes.js';

const $ = id => document.getElementById(id);
const title = s => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const entries = [];
const add = (name, kind, source, build) => entries.push({ name, kind, source, build });
const terrainSource = 'src/render/terrain.js';
function tile(terrain, extras = {}) {
  const scene = new THREE.Group();
  return buildTerrain({ map: { tiles: [{ x: 0, y: 0, terrain, ...extras }] } }, scene).group;
}
for (const [id, unit] of Object.entries(UNITS)) add(unit.name, 'Units', 'src/render/unitMeshes.js', p => buildUnitMesh({ id: 'preview', type: id }, p));
for (const [id, tribe] of Object.entries(TRIBES)) add(tribe.name, 'Portraits', 'src/render/tribePortraits.js', () => buildTribePortrait(id));
for (const id of Object.values(TERRAIN)) add(title(id), 'Terrain', terrainSource, () => tile(id));
for (const id of Object.values(RESOURCE)) add(title(id), 'Resources', terrainSource, () => tile(({ fish:'water', whale:'ocean', metal:'mountain', game:'forest' })[id] || 'field', { resource:id }));
for (const id of Object.values(BUILDING)) add(title(id), 'Buildings', terrainSource, () => tile(id === 'port' ? 'water' : 'field', { building:id }));
for (const level of [1, 3, 5]) for (const walls of [false, true]) add(`City level ${level}${walls ? ' · walls' : ''}`, 'Cities', terrainSource, p => cityMesh({ level, walls }, p));
for (const kind of new Set(entries.map(e => e.kind))) $('category').add(new Option(kind, kind));
for (const [id, tribe] of Object.entries(TRIBES)) $('tribe').add(new Option(tribe.name, id));
$('tribe').value = 'imperius';

function dispose(model) {
  model.traverse(o => { o.geometry?.dispose(); if (o.material) for (const m of [o.material].flat()) m.dispose(); });
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  // Match the board lighting so materials can be judged in their real environment.
  scene.add(new THREE.AmbientLight(0xffffff, .75));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1); sun.position.set(20,40,10); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fc6ff,.35); fill.position.set(-20,20,-15); scene.add(fill);
  const camera = new THREE.OrthographicCamera(-2,2,2,-2,.01,100);
  let model, selected = entries[0], boardScale = false;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.minZoom = .25; controls.maxZoom = 8;
  const stage = $('stage');
  let extent = 1;
  function build(entry) {
    const mesh = entry.build(TRIBES[$('tribe').value].colors);
    const hp = mesh.getObjectByName('hpbar'); if (hp) hp.visible = false;
    const bounds = new THREE.Box3();
    mesh.traverse(o => { if (o.isMesh) { o.updateWorldMatrix(true,false); bounds.expandByObject(o); } });
    const center = bounds.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    extent = Math.max(...bounds.getSize(new THREE.Vector3()).toArray()) * .85;
    return mesh;
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w,h);
    const span = boardScale ? h / 64 : Math.max(extent, .45);
    camera.left = -span*w/h; camera.right = span*w/h; camera.top = span; camera.bottom = -span;
    camera.updateProjectionMatrix();
  }
  function reset() {
    camera.position.set(4,4,4); controls.target.set(0,0,0); camera.zoom = 1;
    controls.update(); resize();
  }
  function select(entry) {
    if (model) { scene.remove(model); dispose(model); }
    selected = entry; model = build(entry); scene.add(model);
    model.traverse(o => { if (o.material && 'wireframe' in o.material) o.material.wireframe = $('wire').checked; });
    $('name').textContent = entry.name; $('kind').textContent = entry.kind;
    $('source').textContent = entry.source; $('source').href = './' + entry.source;
    let meshes = 0, triangles = 0;
    model.traverse(o => { if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count)/3; } });
    $('geometry').textContent = `${meshes} meshes · ${Math.round(triangles)} triangles`;
    $('note').textContent = entry.kind === 'Portraits' ? 'Portrait headgear is tribe-specific; palette switching affects units and cities.' : entry.kind === 'Buildings' || entry.kind === 'Resources' ? 'Shown on a context tile. Several objects currently share placeholder geometry in the game.' : 'Board scale uses 32 pixels per world unit as a reference; the game camera varies with map size and zoom.';
    for (const e of entries) e.button.setAttribute('aria-pressed', String(e === entry));
    reset();
  }
  function thumbnails() {
    if (model) scene.remove(model);
    renderer.setSize(180,180);
    for (const e of entries) {
      const object = build(e); scene.add(object);
      camera.position.set(4,4,4); camera.lookAt(0,0,0); camera.zoom=1;
      camera.left = camera.bottom = -Math.max(extent,.45); camera.right = camera.top = Math.max(extent,.45); camera.updateProjectionMatrix();
      renderer.render(scene,camera); e.image.src = renderer.domElement.toDataURL();
      scene.remove(object); dispose(object);
    }
    select(selected);
  }
  for (const e of entries) {
    const button = document.createElement('button'); button.className = 'model';
    const image = new Image(); image.alt = ''; const name = document.createElement('strong'); name.textContent=e.name;
    const kind = document.createElement('small'); kind.textContent=e.kind;
    button.append(image,name,kind); button.onclick = () => select(e);
    e.button=button; e.image=image; $('models').append(button);
  }
  function filter() {
    let count=0;
    for(const e of entries) { const shown = ($('category').value === 'all' || e.kind === $('category').value) && e.name.toLowerCase().includes($('search').value.toLowerCase()); e.button.hidden=!shown; if(shown) count++; }
    $('count').textContent = `${count} of ${entries.length} models${count ? '' : ' · Try another search'}`;
  }
  $('search').oninput=filter; $('category').onchange=filter;
  $('tribe').onchange=thumbnails;
  $('reset').onclick=reset;
  $('size').onclick=() => { boardScale=!boardScale; $('size').setAttribute('aria-pressed',String(boardScale)); reset(); };
  $('wire').onchange=() => select(selected);
  $('rotate').checked = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)) return;
    e.preventDefault();
    if (['+','=','-'].includes(e.key)) camera.zoom = THREE.MathUtils.clamp(camera.zoom*(e.key === '-' ? .85 : 1.15),.25,8);
    else { const s = new THREE.Spherical().setFromVector3(camera.position); s.theta += e.key === 'ArrowLeft' ? -.15 : e.key === 'ArrowRight' ? .15 : 0; s.phi = THREE.MathUtils.clamp(s.phi+(e.key === 'ArrowUp' ? -.15 : e.key === 'ArrowDown' ? .15 : 0),.05,Math.PI-.05); camera.position.setFromSpherical(s); }
    camera.updateProjectionMatrix(); controls.update();
  });
  stage.append(renderer.domElement); thumbnails(); filter();
  new ResizeObserver(resize).observe(stage);
  let last=0;
  renderer.setAnimationLoop(time => { controls.autoRotate=$('rotate').checked; controls.update(Math.min((time-last)/1000,.05)); last=time; renderer.render(scene,camera); });
  window.addEventListener('pagehide', () => { renderer.setAnimationLoop(null); controls.dispose(); if(model) dispose(model); renderer.dispose(); });
} catch(error) { $('error').hidden=false; $('error').textContent=`Unable to start 3D gallery: ${error.message}`; }
