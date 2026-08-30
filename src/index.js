import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ===================== BACKGROUND (canvas radial gradient) =====================
function makeBackgroundTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(
    size / 2, size * 0.46, size * 0.05,
    size / 2, size * 0.46, size * 0.72
  );
  grad.addColorStop(0, '#232323');
  grad.addColorStop(0.35, '#161616');
  grad.addColorStop(0.7, '#0c0c0d');
  grad.addColorStop(1, '#050506');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // extremely subtle noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 4;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ===================== SCENE / RENDERER =====================
const scene = new THREE.Scene();
scene.background = makeBackgroundTexture();

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.55, 8.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const root = document.getElementById('root') ?? document.body;
root.appendChild(renderer.domElement);

// ===================== LIGHTS =====================
const ambient = new THREE.AmbientLight(0x404040, 1.1);
ambient.name = 'ambient';
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.6);
keyLight.name = 'keyLight';
keyLight.position.set(3.2, 6, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.bias = -0.0015;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8fb8ff, 0.55);
fillLight.name = 'fillLight';
fillLight.position.set(-4, 2.4, -2.5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xffe9b8, 1.4, 12, 2);
rimLight.name = 'rimLight';
rimLight.position.set(-2.2, 3.4, -3.2);
scene.add(rimLight);

const bounceLight = new THREE.PointLight(0xffd27a, 0.6, 8, 2);
bounceLight.name = 'bounceLight';
bounceLight.position.set(0, -0.5, 2.5);
scene.add(bounceLight);

// Soft studio environment for reflections (procedural, no external HDR needed)
function makeEnvTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#dfe6ee');
  grad.addColorStop(0.35, '#9aa4b2');
  grad.addColorStop(0.55, '#4a4d54');
  grad.addColorStop(1, '#111214');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, size * 0.15, size, size * 0.05);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const envTex = makeEnvTexture();
scene.environment = envTex;

// ===================== GROUND / CONTACT SHADOW =====================
function makeShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
const shadowTex = makeShadowTexture();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), shadowMat);
shadowBlob.name = 'shadowBlob';
shadowBlob.rotation.x = -Math.PI / 2;
shadowBlob.position.y = -1.42;
scene.add(shadowBlob);

const groundReceiver = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ opacity: 0.28 })
);
groundReceiver.name = 'groundReceiver';
groundReceiver.rotation.x = -Math.PI / 2;
groundReceiver.position.y = -1.43;
groundReceiver.receiveShadow = true;
scene.add(groundReceiver);

// ===================== DUCK MATERIALS =====================
const rubberYellow = new THREE.MeshPhysicalMaterial({
  color: 0xffd21e,
  roughness: 0.28,
  metalness: 0.0,
  clearcoat: 0.85,
  clearcoatRoughness: 0.22,
  sheen: 0.15,
  sheenColor: new THREE.Color(0xfff2b0),
  envMapIntensity: 1.1,
});

// Beak color matched to reference image: bright red / red-orange
const rubberOrange = new THREE.MeshPhysicalMaterial({
  color: 0xee3322,
  roughness: 0.32,
  metalness: 0.0,
  clearcoat: 0.8,
  clearcoatRoughness: 0.25,
  envMapIntensity: 1.05,
});

const eyeMat = new THREE.MeshPhysicalMaterial({
  color: 0x0a0a0a,
  roughness: 0.15,
  metalness: 0.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.3,
});

const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// ===================== DUCK GROUP =====================
const duck = new THREE.Group();
duck.name = 'duck';

// --- Body: lathed profile for a plump rounded rubber-duck silhouette ---
const bodyPoints = [
  new THREE.Vector2(0.0, -0.78),
  new THREE.Vector2(0.30, -0.76),
  new THREE.Vector2(0.62, -0.60),
  new THREE.Vector2(0.82, -0.30),
  new THREE.Vector2(0.90, 0.02),
  new THREE.Vector2(0.86, 0.34),
  new THREE.Vector2(0.68, 0.58),
  new THREE.Vector2(0.42, 0.68),
  new THREE.Vector2(0.18, 0.70),
  new THREE.Vector2(0.0, 0.70),
];
const bodyGeo = new THREE.LatheGeometry(bodyPoints, 48);
bodyGeo.computeVertexNormals();
const body = new THREE.Mesh(bodyGeo, rubberYellow);
body.name = 'duckBody';
body.castShadow = true;
body.receiveShadow = true;
body.position.set(0, -0.1, 0.05);
body.rotation.y = Math.PI * 0.15;
duck.add(body);

// tail bump (small rounded bump at back of body)
const tail = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), rubberYellow);
tail.name = 'duckTail';
tail.castShadow = true;
tail.scale.set(0.9, 0.7, 1.0);
tail.position.set(0, 0.42, -0.72);
duck.add(tail);

// --- Head: large rounded sphere, slightly squashed ---
const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 40), rubberYellow);
head.name = 'duckHead';
head.castShadow = true;
head.receiveShadow = true;
head.scale.set(1.02, 0.94, 1.0);
head.position.set(0, 0.98, 0.62);
duck.add(head);

// small forehead-to-back head bump for the classic toy silhouette
const headBack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 28), rubberYellow);
headBack.name = 'duckHeadBack';
headBack.castShadow = true;
headBack.scale.set(0.9, 0.8, 0.9);
headBack.position.set(0, 1.18, 0.28);
duck.add(headBack);

// --- Beak: two rounded flattened lobes (upper + lower) ---
const beakUpperGeo = new THREE.SphereGeometry(0.34, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62);
const beakUpper = new THREE.Mesh(beakUpperGeo, rubberOrange);
beakUpper.name = 'beakUpper';
beakUpper.castShadow = true;
beakUpper.scale.set(1.0, 0.62, 1.35);
beakUpper.position.set(0, 0.92, 1.18);
beakUpper.rotation.x = Math.PI * 0.06;
duck.add(beakUpper);

const beakLowerGeo = new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
const beakLower = new THREE.Mesh(beakLowerGeo, rubberOrange);
beakLower.name = 'beakLower';
beakLower.castShadow = true;
beakLower.scale.set(0.92, 0.45, 1.15);
beakLower.position.set(0, 0.78, 1.12);
beakLower.rotation.x = Math.PI;
duck.add(beakLower);

// nostril dots
function makeNostril(x) {
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), eyeMat);
  n.name = 'nostril';
  n.position.set(x, 1.0, 1.46);
  return n;
}
duck.add(makeNostril(0.12));
duck.add(makeNostril(-0.12));

// --- Eyes: small black spheres with white highlight ---
function makeEye(xSign) {
  const eyeGroup = new THREE.Group();
  eyeGroup.name = 'eye_' + (xSign > 0 ? 'right' : 'left');

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 16), eyeMat);
  eye.name = 'eyeBall';
  eye.castShadow = true;
  eyeGroup.add(eye);

  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeHighlightMat);
  highlight.name = 'eyeHighlight';
  highlight.position.set(0.03, 0.03, 0.06);
  eyeGroup.add(highlight);

  eyeGroup.position.set(xSign * 0.32, 1.12, 1.08);
  return eyeGroup;
}
duck.add(makeEye(1));
duck.add(makeEye(-1));

// --- Wings: small rounded flattened lobes on each side of body ---
function makeWing(xSign) {
  const wingGeo = new THREE.SphereGeometry(0.4, 24, 24);
  const wing = new THREE.Mesh(wingGeo, rubberYellow);
  wing.name = 'wing_' + (xSign > 0 ? 'right' : 'left');
  wing.castShadow = true;
  wing.receiveShadow = true;
  wing.scale.set(0.32, 0.62, 0.9);
  wing.position.set(xSign * 0.82, -0.02, -0.02);
  wing.rotation.z = xSign * 0.22;
  wing.rotation.y = xSign * 0.15;
  return wing;
}
const wingRight = makeWing(1);
const wingLeft = makeWing(-1);
duck.add(wingRight);
duck.add(wingLeft);

// --- Cheeks (subtle rounded volume where head meets beak) ---
function makeCheek(xSign) {
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 20), rubberYellow);
  cheek.name = 'cheek_' + (xSign > 0 ? 'right' : 'left');
  cheek.castShadow = true;
  cheek.scale.set(1.0, 0.85, 0.8);
  cheek.position.set(xSign * 0.42, 0.94, 0.98);
  return cheek;
}
duck.add(makeCheek(1));
duck.add(makeCheek(-1));

duck.scale.setScalar(1.05);
duck.position.y = 0.15;
scene.add(duck);

// Invisible larger hit-sphere for easier clicking/hover on mobile
const hitGeo = new THREE.SphereGeometry(1.5, 12, 12);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hitSphere = new THREE.Mesh(hitGeo, hitMat);
hitSphere.name = 'duckHitSphere';
hitSphere.position.copy(duck.position);
hitSphere.position.y += 0.1;
scene.add(hitSphere);

// ===================== CONTROLS =====================
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.enableZoom = false;
controls.minPolarAngle = Math.PI * 0.32;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minAzimuthAngle = -Math.PI * 0.28;
controls.maxAzimuthAngle = Math.PI * 0.28;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;

// ===================== QUACK SOUND =====================
let soundEnabled = true;
const duckAudio = new Audio('/sounds/duck-quacking.mp3');
duckAudio.volume = 0.6;

function playQuackSound() {
  if (!soundEnabled) return;

  // Restart audio on every click to prevent overlapping or waiting
  duckAudio.currentTime = 0;
  duckAudio.play().catch((e) => {
    // Catch browser autoplay/interaction restrictions if they occur
    console.warn('Audio play failed:', e);
  });
}

// ===================== SOUND TOGGLE =====================
const soundToggleBtn = document.getElementById('sound-toggle');
const soundIconEl = document.getElementById('sound-icon');
const soundLabelEl = document.getElementById('sound-label');

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundIconEl) soundIconEl.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundLabelEl) soundLabelEl.textContent = soundEnabled ? 'Sound ON' : 'Sound OFF';
    soundToggleBtn.setAttribute('aria-label', soundEnabled ? 'Mute quack sounds' : 'Unmute quack sounds');
  });
}

// ===================== RAYCAST / HOVER / CLICK STATE =====================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let isHovering = false;
let isAnimatingClick = false;
let quackCount = 0;

let idleTime = 0;
let lastFrameTime = performance.now();

// jump/squash animation state
const jumpDuration = 0.62;
let jumpElapsed = jumpDuration;
let wiggleSeed = Math.random() * 10;

function setPointerFromEvent(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function checkHover(clientX, clientY) {
  setPointerFromEvent(clientX, clientY);
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObject(hitSphere, false);
  const hovering = hits.length > 0;
  if (hovering !== isHovering) {
    isHovering = hovering;
    renderer.domElement.style.cursor = isHovering ? 'pointer' : 'default';
  }
  return hovering;
}

function triggerQuack(clientX, clientY) {
  quackCount += 1;
  updateCounterUI(quackCount);
  spawnQuackText(clientX, clientY);
  spawnRipple(clientX, clientY);
  startJumpAnimation();
  playQuackSound();
}

function startJumpAnimation() {
  jumpElapsed = 0;
  wiggleSeed = Math.random() * 10;
  isAnimatingClick = true;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  checkHover(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  const hovering = checkHover(e.clientX, e.clientY);
  if (hovering) {
    triggerQuack(e.clientX, e.clientY);
  }
});

renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    const hovering = checkHover(t.clientX, t.clientY);
    if (hovering) triggerQuack(t.clientX, t.clientY);
  }
}, { passive: true });

// ===================== KEYBOARD ACCESSIBILITY =====================
window.addEventListener('keydown', (e) => {
  // Only trigger on Enter/Space, and not when an input/button is focused
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // Simulate click at screen center (where the duck is)
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    triggerQuack(cx, cy);
  }
});

// ===================== ANIMATION LOOP =====================
function animate() {
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  idleTime += dt;

  // idle floating bob
  const idleBob = Math.sin(idleTime * 1.4) * 0.06;

  let jumpY = 0;
  let squashX = 1, squashY = 1, squashZ = 1;
  let wiggleZ = 0;

  if (isAnimatingClick) {
    jumpElapsed += dt;
    const t = Math.min(jumpElapsed / jumpDuration, 1);

    // arc jump (parabolic)
    const arc = Math.sin(t * Math.PI);
    jumpY = arc * 0.55;

    // squash at start (t=0), stretch mid-air, squash on landing (t=1)
    let squashAmt = 0;
    if (t < 0.18) {
      const s = t / 0.18;
      squashAmt = -s; // squash down before launch
    } else if (t < 0.75) {
      const s = (t - 0.18) / 0.57;
      squashAmt = -1 + s * 1.4; // stretch upward through the air
    } else {
      const s = (t - 0.75) / 0.25;
      squashAmt = 0.4 - s * 0.4; // squash on landing settle
    }
    squashY = 1 + squashAmt * 0.22;
    squashX = 1 - squashAmt * 0.14;
    squashZ = 1 - squashAmt * 0.14;

    // playful wiggle rotation while airborne
    wiggleZ = Math.sin((t * 6 + wiggleSeed)) * 0.16 * Math.sin(t * Math.PI);

    if (t >= 1) {
      isAnimatingClick = false;
    }
  }

  duck.position.y = 0.15 + idleBob + jumpY;
  duck.scale.set(1.05 * squashX, 1.05 * squashY, 1.05 * squashZ);
  duck.rotation.z = wiggleZ;
  duck.rotation.y = Math.sin(idleTime * 0.3) * 0.05;

  hitSphere.position.y = duck.position.y + 0.1;

  // hover highlight scale (applied on top, subtle)
  const hoverScale = isHovering && !isAnimatingClick ? 1.035 : 1.0;
  duck.scale.multiplyScalar(hoverScale);

  // contact shadow reacts to jump height
  const shadowScale = 1 - jumpY * 0.5;
  shadowBlob.scale.set(shadowScale, shadowScale, 1);
  shadowMat.opacity = Math.max(0.35, 1 - jumpY * 1.1);

  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// ===================== RESIZE =====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===================== DOM UI HOOKS =====================
function updateCounterUI(count) {
  const counterEl = document.getElementById('quack-count');
  if (counterEl) {
    counterEl.textContent = String(count);
    counterEl.classList.remove('pop');
    void counterEl.offsetWidth;
    counterEl.classList.add('pop');
  }
}

function spawnQuackText(clientX, clientY) {
  const variations = ['QUACK!', 'QUACK!!', 'QUAAAACK!', 'QUACK?!', 'QUACK 🦆'];
  const text = variations[Math.floor(Math.random() * variations.length)];
  const el = document.createElement('div');
  el.className = 'quack-pop';
  el.textContent = text;
  el.style.left = clientX + 'px';
  el.style.top = clientY + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function spawnRipple(clientX, clientY) {
  const el = document.createElement('div');
  el.className = 'click-ripple';
  el.style.left = clientX + 'px';
  el.style.top = clientY + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}
