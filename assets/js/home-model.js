import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.querySelector('#bree-canvas');
const story = document.querySelector('.home-hero');
const heroCopy = document.querySelector('.hero-copy');
const heroCopyPanel = document.querySelector('.hero-copy-panel');
const stageCopy = document.querySelector('.hero-stage-copy .stage-text');
const stageCount = document.querySelector('.hero-stage-copy .count');
const modelStatus = document.querySelector('#model-status');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!canvas || !story) throw new Error('BREE model stage is missing');

// Keep the opening card deterministic without holding a permanent animation loop.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let openingLock = true;
let openingReleaseTimer = null;
let frameId = 0;
let storyTop = 0;
let storyScrollRange = 1;

const resetHomepageScroll = () => {
  window.scrollTo({left: 0, top: 0, behavior: 'auto'});
  document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
};

const requestFrame = () => {
  if (frameId || document.hidden) return;
  frameId = requestAnimationFrame(render);
};

const renderNow = () => {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  render();
};

const releaseOpeningLock = () => {
  if (openingReleaseTimer) clearTimeout(openingReleaseTimer);
  openingReleaseTimer = setTimeout(() => {
    resetHomepageScroll();
    openingLock = false;
    updateScrollMetrics();
    requestFrame();
  }, 160);
};

resetHomepageScroll();
releaseOpeningLock();
addEventListener('pageshow', () => {
  openingLock = true;
  resetHomepageScroll();
  releaseOpeningLock();
}, {once: true});

// The right-side composition is the single homepage layout.
const isRightLayout = true;

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
const tunedCamera = {
  camera: {x: 2.73, y: -.07133325195312488, z: 2.74},
  lookAt: {x: .14, y: .07},
  yaw: .02427622440170154,
  scale: .69,
  model: {x: .81, y: -.05},
};
const explosionArmDistance = .48;
const explosionPartDistance = .32;
const cameraHome = isRightLayout ? tunedCamera.camera : {x: 0, y: .18, z: 2.85};
camera.position.set(cameraHome.x, cameraHome.y, cameraHome.z);

const rig = new THREE.Group();
scene.add(rig);
scene.add(new THREE.HemisphereLight(0xf3f1e8, 0x546363, 2.15));
const key = new THREE.DirectionalLight(0xffffff, 3.3);
key.position.set(3, 5, 4);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9bb0b2, 1.8);
fill.position.set(-4, 2, -2);
scene.add(fill);

let model = null;
let modelParts = [];
let modelLoadStarted = false;
let modelJustLoaded = false;
let pointerX = 0;
let pointerY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let dragYaw = 0;
let dragPitch = 0;
let targetDragYaw = 0;
let targetDragPitch = 0;
let dragging = false;
let returnTimer = null;
let lastProgress = -1;
let lastExplode = -1;
let lastReset = -1;
let lastRenderedPointerX = 0;
let lastRenderedPointerY = 0;
let lastStage = '';
const materialCache = new Map();

function clamp(value, min = 0, max = 1){
  return Math.min(max, Math.max(min, value));
}

function smooth(value){
  value = clamp(value);
  return value * value * (3 - 2 * value);
}

function segment(progress, start, end){
  return smooth((progress - start) / (end - start));
}

function paletteColor(name){
  if (name.includes('机械臂')) return 0x263332;
  if (name.includes('灯带')) return 0x6f8580;
  if (name.includes('相机')) return 0x1c2323;
  if (name.includes('角码') || name.includes('板')) return 0x8b9593;
  return 0xa6aeab;
}

function paletteMaterial(color){
  const key = color.toString(16);
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshBasicMaterial({
      color,
      // Some SolidWorks/STL parts have mixed winding directions. Keep both
      // sides visible so the physical cell does not disappear after loading.
      side: THREE.DoubleSide,
    }));
  }
  return materialCache.get(key);
}

function updateScrollMetrics(){
  const rect = story.getBoundingClientRect();
  storyTop = rect.top + window.scrollY;
  storyScrollRange = Math.max(story.offsetHeight - window.innerHeight, 1);
}

function getProgress(){
  return clamp((window.scrollY - storyTop) / storyScrollRange);
}

function setHeroVar(name, value){
  if (story.style.getPropertyValue(name) !== value) story.style.setProperty(name, value);
}

function prepareModel(object){
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const baseScale = 2.0 / Math.max(size.x, size.y, size.z);

  // Center after scaling. Three.js does not scale Object3D.position, so using
  // -center here would leave the assembly offset from the explosion origin.
  object.position.copy(center).multiplyScalar(-baseScale);
  object.scale.setScalar(baseScale);
  object.updateMatrixWorld(true);

  object.traverse((node) => {
    if (!node.isMesh) return;
    // Reuse the small palette of materials.
    node.material = paletteMaterial(paletteColor(node.name || ''));

    // Build the explosion vector in normalized world space, then transform it
    // back into the component parent's local space. The previous version wrote
    // a world-space direction straight into node.position, which made the
    // displacement collapse under the imported assembly transforms.
    const partCenter = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    const direction = partCenter.clone();
    direction.y = direction.y * .72 + .08;
    if (direction.lengthSq() < .0001) direction.set(.22, .12, .16);
    direction.normalize();

    const parentInverse = node.parent.matrixWorld.clone().invert();
    const localOrigin = new THREE.Vector3().applyMatrix4(parentInverse);
    const distance = /机械臂/.test(node.name || '')
      ? explosionArmDistance
      : explosionPartDistance;
    const worldEndpoint = direction.clone().multiplyScalar(distance);
    const localEndpoint = worldEndpoint.applyMatrix4(parentInverse);
    const explosionOffset = localEndpoint.sub(localOrigin);

    modelParts.push({
      node,
      basePosition: node.position.clone(),
      explosionOffset,
    });
  });

  rig.add(object);
  model = object;
  modelJustLoaded = true;
  lastProgress = -1;
  document.body.dataset.modelParts = String(modelParts.length);
  document.body.dataset.modelMaterial = 'cached-basic';
  if (modelStatus) modelStatus.textContent = `${modelParts.length} SLDASM components · optimized web mesh`;
  requestFrame();
}

function loadModel(){
  if (modelLoadStarted) return;
  modelLoadStarted = true;
  new GLTFLoader().load(
    'assets/models/bree-rack-sldasm.glb?v=20260922-perf1',
    gltf => prepareModel(gltf.scene),
    undefined,
    error => {
      console.warn('BREE SLDASM GLB could not be loaded.', error);
      if (modelStatus) modelStatus.textContent = 'STEP mesh unavailable · source retained';
      setHeroVar('--model-opacity', '0');
    },
  );
}

function scheduleModelLoad(){
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(loadModel, {timeout: 1400});
  } else {
    setTimeout(loadModel, 280);
  }
}

function updateModel(progress){
  const posterOpacity = 1 - segment(progress, .08, .28);
  const reveal = segment(progress, .12, .30);
  const reset = segment(progress, .30, .42);
  const explode = progress < .48
    ? segment(progress, .28, .48)
    : progress < .68
      ? 1
      : 1 - segment(progress, .68, .86);
  const measure = segment(progress, .28, .46) * (1 - segment(progress, .78, .88));
  const pointerBlend = explode * (1 - segment(progress, .78, .90));

  setHeroVar('--hero-progress', progress.toFixed(4));
  setHeroVar('--model-opacity', reveal.toFixed(4));
  setHeroVar('--poster-opacity', posterOpacity.toFixed(4));
  setHeroVar('--poster-wash', (0.52 - posterOpacity * .30).toFixed(4));
  setHeroVar('--measure-opacity', measure.toFixed(4));
  setHeroVar('--hero-copy-opacity', reveal.toFixed(4));
  setHeroVar('--stage-copy-opacity', '1');
  setHeroVar('--scroll-opacity', (1 - segment(progress, .55, .70)).toFixed(4));

  if (model && (modelJustLoaded || Math.abs(explode - lastExplode) > .0001 || Math.abs(reset - lastReset) > .0001)) {
    modelParts.forEach(({node, basePosition, explosionOffset}) => {
      node.position.set(
        basePosition.x + explosionOffset.x * explode,
        basePosition.y + explosionOffset.y * explode,
        basePosition.z + explosionOffset.z * explode,
      );
    });
    lastExplode = explode;
    lastReset = reset;
    modelJustLoaded = false;
  }

  if (model) {
    // SolidWorks exports Z-up; Three.js is Y-up.
    rig.rotation.x = -Math.PI / 2 + dragPitch * (1 - reset) + pointerY * .035 * pointerBlend;
    rig.rotation.y = (isRightLayout ? tunedCamera.yaw : 0) + dragYaw * (1 - reset) + pointerX * .055 * pointerBlend;
    if (isRightLayout) {
      rig.position.x = tunedCamera.model.x;
      rig.position.y = tunedCamera.model.y;
      rig.scale.setScalar(tunedCamera.scale);
    } else {
      rig.position.x = 0;
      rig.position.y = -.15 + segment(progress, .30, .55) * .025;
      rig.scale.setScalar(1 + segment(progress, .28, .55) * .18);
    }
  }

  const stage = progress < .30
    ? ['01', 'A reproducible physical cell opens the benchmark.']
    : progress < .70
      ? ['02', 'Structure, light and bimanual geometry are specified together.']
      : ['03', 'The exploded specification gives way to real task evidence.'];
  const stageKey = stage.join('|');
  if (stageKey !== lastStage) {
    if (stageCount) stageCount.textContent = stage[0];
    if (stageCopy) stageCopy.textContent = stage[1];
    lastStage = stageKey;
  }
}

function resize(){
  updateScrollMetrics();
  if (heroCopy && heroCopyPanel) heroCopyPanel.style.height = `${heroCopy.offsetHeight}px`;
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  const maxPixelRatio = window.innerWidth < 900 ? 1.15 : 1.35;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  requestFrame();
}

function render(){
  frameId = 0;
  const progress = openingLock ? 0 : getProgress();
  const progressChanged = Math.abs(progress - lastProgress) > .0001;
  const previousDragYaw = dragYaw;
  const previousDragPitch = dragPitch;
  dragYaw += (targetDragYaw - dragYaw) * .14;
  dragPitch += (targetDragPitch - dragPitch) * .14;
  const dragChanged = Math.abs(dragYaw - previousDragYaw) > .0001 || Math.abs(dragPitch - previousDragPitch) > .0001;
  const pointerChanged = Math.abs(pointerX - lastRenderedPointerX) > .001 || Math.abs(pointerY - lastRenderedPointerY) > .001;

  if (progressChanged || dragChanged || pointerChanged || modelJustLoaded) updateModel(progress);
  lastProgress = progress;
  lastRenderedPointerX = pointerX;
  lastRenderedPointerY = pointerY;

  const cameraX = isRightLayout ? tunedCamera.camera.x : pointerX * .03;
  const cameraY = isRightLayout ? tunedCamera.camera.y : .18 + pointerY * .02;
  const cameraZ = isRightLayout ? tunedCamera.camera.z : 2.85 - progress * .18;
  camera.position.x += (cameraX - camera.position.x) * .045;
  camera.position.y += (cameraY - camera.position.y) * .045;
  camera.position.z += (cameraZ - camera.position.z) * .045;
  camera.lookAt(isRightLayout ? tunedCamera.lookAt.x : .30, isRightLayout ? tunedCamera.lookAt.y : .04, 0);

  const cameraSettling = Math.abs(camera.position.x - cameraX) > .0001
    || Math.abs(camera.position.y - cameraY) > .0001
    || Math.abs(camera.position.z - cameraZ) > .0001;
  const modelVisible = progress >= .12 || dragging;
  if (model && modelVisible && (progressChanged || dragChanged || pointerChanged || cameraSettling)) {
    renderer.render(scene, camera);
  }

  // Keep a lightweight frame loop alive so scroll progress is sampled even in
  // browsers that coalesce scroll events while a sticky section is active.
  frameId = requestAnimationFrame(render);
}

addEventListener('resize', resize, {passive: true});
addEventListener('scroll', () => {
  // Start decoding only when the user actually enters the 3D story if idle time
  // was unavailable during the initial page load.
  if (!modelLoadStarted) loadModel();
  // Scroll-driven state must update immediately. Depending only on rAF can
  // leave the assembly frozen when a browser throttles or coalesces frames.
  renderNow();
}, {passive: true});
addEventListener('pointermove', (event) => {
  pointerX = (event.clientX / Math.max(window.innerWidth, 1) - .5) * 2;
  pointerY = (event.clientY / Math.max(window.innerHeight, 1) - .5) * 2;
  if (dragging) {
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    targetDragYaw = clamp(targetDragYaw + dx * .008, -.85, .85);
    targetDragPitch = clamp(targetDragPitch + dy * .005, -.48, .48);
  }
  if (dragging || (model && getProgress() >= .12)) requestFrame();
}, {passive: true});

canvas.addEventListener('pointerdown', (event) => {
  if (returnTimer) clearTimeout(returnTimer);
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
  requestFrame();
});
canvas.addEventListener('pointerup', (event) => {
  dragging = false;
  canvas.releasePointerCapture?.(event.pointerId);
  returnTimer = setTimeout(() => {
    targetDragYaw = 0;
    targetDragPitch = 0;
    requestFrame();
  }, 900);
  requestFrame();
});
canvas.addEventListener('pointercancel', () => {
  dragging = false;
  requestFrame();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestFrame();
});

resize();
document.fonts?.ready.then(() => {
  if (heroCopy && heroCopyPanel) heroCopyPanel.style.height = `${heroCopy.offsetHeight}px`;
  resize();
});
scheduleModelLoad();
