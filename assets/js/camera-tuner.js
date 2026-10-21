import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.querySelector('#tuner-canvas');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
const rig = new THREE.Group();
scene.add(rig);

const defaults = {
  camera: {x:2.73, y:-0.07133325195312488, z:2.74},
  lookAt: {x:.14, y:.07},
  yaw: 0.02427622440170154,
  scale: .69,
  model: {x:.81, y:-.05},
};
const values = structuredClone(defaults);
let model = null;

const fields = {
  camX: ['cam-x','cam-x-out', () => values.camera.x, v => values.camera.x=v],
  camY: ['cam-y','cam-y-out', () => values.camera.y, v => values.camera.y=v],
  camZ: ['cam-z','cam-z-out', () => values.camera.z, v => values.camera.z=v],
  lookX: ['look-x','look-x-out', () => values.lookAt.x, v => values.lookAt.x=v],
  lookY: ['look-y','look-y-out', () => values.lookAt.y, v => values.lookAt.y=v],
  yaw: ['yaw','yaw-out', () => values.yaw * 180 / Math.PI, v => values.yaw=v * Math.PI / 180],
  scale: ['scale','scale-out', () => values.scale, v => values.scale=v],
  modelX: ['model-x','model-x-out', () => values.model.x, v => values.model.x=v],
  modelY: ['model-y','model-y-out', () => values.model.y, v => values.model.y=v],
};

function paletteColor(name){
  if(name.includes('机械臂')) return 0x263332;
  if(name.includes('灯带')) return 0x6f8580;
  if(name.includes('相机')) return 0x1c2323;
  if(name.includes('角码') || name.includes('板')) return 0x8b9593;
  return 0xa6aeab;
}

function syncControls(){
  Object.values(fields).forEach(([inputId, outputId, get]) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    const value = get();
    input.value = String(value);
    output.textContent = Number(value).toFixed(2);
  });
}

Object.values(fields).forEach(([inputId,, ,set]) => {
  document.getElementById(inputId).addEventListener('input', event => {
    set(Number(event.target.value));
    syncControls();
  });
});

function applyView(){
  camera.position.set(values.camera.x, values.camera.y, values.camera.z);
  camera.lookAt(values.lookAt.x, values.lookAt.y, 0);
  if(rig){
    rig.rotation.set(-Math.PI / 2, values.yaw, 0);
    rig.position.set(values.model.x, values.model.y, 0);
    rig.scale.setScalar(values.scale);
  }
}

function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(innerHeight, 1);
  camera.updateProjectionMatrix();
}

new GLTFLoader().load(
  'assets/models/bree-rack-sldasm.glb?v=20260917-components',
  gltf => {
    const object = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    object.position.sub(center);
    object.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    object.traverse(node => {
      if(!node.isMesh) return;
      node.material = new THREE.MeshBasicMaterial({color:paletteColor(node.name || ''), side:THREE.DoubleSide});
    });
    rig.add(object);
    model = object;
    status.textContent = 'SLDASM 模型已加载 · 拖拽或滑杆调节后点击确认';
  },
  undefined,
  error => { console.error(error); status.textContent = '模型加载失败，请检查本地服务'; },
);

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', event => {
  dragging = true; lastX = event.clientX; lastY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId); event.preventDefault();
});
canvas.addEventListener('pointermove', event => {
  if(!dragging) return;
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX; lastY = event.clientY;
  values.yaw = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, values.yaw + dx * .006));
  values.camera.y = Math.max(-1, Math.min(4, values.camera.y - dy * .008));
  syncControls(); event.preventDefault();
}, {passive:false});
canvas.addEventListener('pointerup', event => { dragging = false; canvas.releasePointerCapture?.(event.pointerId); });
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('wheel', event => {
  values.camera.z = Math.max(2, Math.min(8, values.camera.z + event.deltaY * .003));
  syncControls(); event.preventDefault();
}, {passive:false});

document.getElementById('reset').addEventListener('click', () => {
  Object.assign(values.camera, defaults.camera);
  Object.assign(values.lookAt, defaults.lookAt);
  values.yaw = defaults.yaw; values.scale = defaults.scale;
  Object.assign(values.model, defaults.model); syncControls();
});

document.getElementById('copy').addEventListener('click', async () => {
  const text = JSON.stringify(values, null, 2);
  try { await navigator.clipboard.writeText(text); status.textContent = '配置已复制到剪贴板'; }
  catch { status.textContent = text; }
});

document.getElementById('confirm').addEventListener('click', async () => {
  const payload = { ...values, source:'camera-tuner', updatedAt:new Date().toISOString() };
  try {
    const response = await fetch('/api/camera-config', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    status.textContent = '候选角度已写入 camera-tuning-candidate.json，请回到对话告诉我“确认”。';
  } catch(error) {
    console.error(error);
    status.textContent = '写入失败：请确保使用 camera tuner 专用本地服务。';
  }
});

syncControls(); resize(); addEventListener('resize', resize);
function render(){ applyView(); renderer.render(scene, camera); requestAnimationFrame(render); }
render();
