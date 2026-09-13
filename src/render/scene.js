import * as THREE from 'three';

/**
 * Fixed isometric view: an orthographic camera on the (1,1,1) diagonal.
 * Fixed angle keeps tile and unit silhouettes readable, which is the whole
 * reason Polytopia's board is legible on a phone.
 */
export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1418);

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
  camera.position.set(40, 40, 40);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  ambient.layers.enable(1);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
  sun.position.set(20, 40, 10);
  sun.layers.enable(1);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fc6ff, 0.35);
  fill.position.set(-20, 20, -15);
  fill.layers.enable(1);
  scene.add(fill);

  const state = { zoom: 1, center: new THREE.Vector3(0, 0, 0) };

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    const aspect = w / h;
    const view = 11 / state.zoom;
    camera.left = -view * aspect;
    camera.right = view * aspect;
    camera.top = view;
    camera.bottom = -view;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function focusOn(x, z) {
    state.center.set(x, 0, z);
    camera.position.set(x + 40, 40, z + 40);
    camera.lookAt(state.center);
  }

  function setZoom(z) {
    state.zoom = Math.min(2.5, Math.max(0.5, z));
    resize();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  /** Screen click -> the first mesh hit among `targets`. */
  function pick(event, targets) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(targets, true);
    return hits.length ? hits[0] : null;
  }

  function render() {
    // Terrain, buildings and tile highlights form the base image. Clearing only
    // depth lets units cover that image without losing their own 3D occlusion.
    const background = scene.background;
    const mask = camera.layers.mask;
    const autoClear = renderer.autoClear;
    try {
      camera.layers.set(0);
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.clearDepth();
      camera.layers.set(1);
      scene.background = null;
      renderer.autoClear = false;
      renderer.render(scene, camera);
    } finally {
      scene.background = background;
      camera.layers.mask = mask;
      renderer.autoClear = autoClear;
    }
  }

  return { scene, camera, renderer, resize, focusOn, setZoom, pick, viewState: state, render };
}
