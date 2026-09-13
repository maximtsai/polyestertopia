import * as THREE from 'three';

// Original geometric portraits, built from primitives rather than image assets.
export function buildTribePortrait(id) {
  const group = new THREE.Group();
  const add = (geometry, color, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  const box = (w, h, d, color, x, y, z) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  box(1, .88, .85, 0xeeb33d, 0, 0, 0);
  for (const x of [-.23, .23]) {
    box(.23, .32, .035, 0xfffcdf, x, .06, .44);
    box(.085, .24, .045, 0x202a33, x + .045, .04, .46);
  }
  if (id === 'xinxi') {
    box(1.14, .23, 1.02, 0x303d48, 0, .48, 0);
    add(new THREE.ConeGeometry(.82, .56, 4), 0x445461, 0, .8, 0).rotation.y = Math.PI / 4;
    box(.16, .45, .52, 0xe84e36, 0, .99, 0);
    for (const x of [-.59, .59]) box(.22, .7, .9, 0x303d48, x, .02, -.08).rotation.z = -x * .25;
  } else if (id === 'imperius') {
    box(1.12, .25, 1, 0xffdc69, 0, .49, 0);
    box(.76, .16, .75, 0xffefab, 0, .69, 0);
    box(.24, .3, .86, 0xe34232, 0, .89, -.04);
    box(.18, .54, .82, 0xffd34d, -.57, -.04, 0);
  } else if (id === 'bardur') {
    add(new THREE.ConeGeometry(.79, .68, 5), 0x64727b, 0, .7, 0).rotation.y = .3;
    box(1.13, .18, .98, 0x35434e, 0, .43, 0);
    for (const x of [-.66, .66]) {
      const horn = add(new THREE.ConeGeometry(.16, .75, 4), 0xf4f0dd, x, .72, 0);
      horn.rotation.z = -x * .65;
    }
  } else {
    box(1.17, .3, 1.04, 0xf7f6eb, 0, .45, 0);
    add(new THREE.DodecahedronGeometry(.67, 0), 0xfffdf3, 0, .8, -.05);
    box(.22, .81, 1, 0xe0e6e6, -.58, -.02, 0);
    box(1.12, .25, 1, 0xf6f6ed, 0, -.42, 0);
    box(.22, .58, .28, 0xffffff, .59, -.23, -.31);
  }
  return group;
}

export function mountTribePortraits(slots) {
  const views = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  for (const [id, host] of slots) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(220, 220);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 6); scene.add(light);
      const camera = new THREE.OrthographicCamera(-1.45, 1.45, 1.45, -1.45, .1, 30);
      camera.position.set(3, 2.1, 6); camera.lookAt(0, .25, 0);
      const model = buildTribePortrait(id); scene.add(model);
      views.push({ renderer, scene, camera, model, host });
    } catch {
      renderer?.dispose();
      host.textContent = id === 'xinxi' ? '⛰' : id === 'imperius' ? '♜' : id === 'bardur' ? '♟' : '☀';
    }
  }
  function draw(time) {
    for (const v of views) {
      const selected = v.host.parentElement.classList.contains('selected');
      v.model.rotation.y = reduced.matches ? 0 : Math.sin(time * .0007) * (selected ? .22 : .08);
      v.model.position.y = reduced.matches ? 0 : Math.sin(time * .0015) * .035;
      v.renderer.render(v.scene, v.camera);
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    for (const v of views) {
      v.scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      v.renderer.dispose(); v.renderer.forceContextLoss(); v.renderer.domElement.remove();
    }
  };
}
