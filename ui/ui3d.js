/* GIAO DIỆN 3D (Three.js). Cùng hợp đồng với ui2d.js. Màn hình đọc dùng lại của ui2d (lớp phủ DOM). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { UI as U2 } from './ui2d.js';

const COLORS = ['#8b2e2e', '#2e5a8b', '#2e7a4f', '#7a4f2e', '#6a2e8b', '#8b6a2e', '#2e7a7a', '#5a2e3d', '#3d5a2e', '#4a4a7a'];
const hash = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
const BOOK_GEO = new THREE.BoxGeometry(.07, 1, .26), SHARED = new Set([BOOK_GEO]);

let app, renderer, scene, camera, world, running = false, bookMeshes = [], hoverM = null;
let yaw = 0, pitch = 0, L = 14, keys = {}, tip, ov, crumbsEl, musBtn, musName, last = 0, drag = null;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();

/* ---------- vật thể ---------- */
function labelTex(text, w, hgt, font, fg, bg) {
  const c = document.createElement('canvas'); c.width = w; c.height = hgt; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, hgt); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = font; do { x.font = `bold ${size}px Georgia`; size -= 2; } while (x.measureText(text).width > w - 24 && size > 12);
  x.fillText(text, w / 2, hgt / 2); return new THREE.CanvasTexture(c);
}
function spineTex(title, col) {
  const c = document.createElement('canvas'); c.width = 48; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = col; x.fillRect(0, 0, 48, 256); x.fillStyle = '#e0b85a'; x.fillRect(0, 10, 48, 3); x.fillRect(0, 243, 48, 3);
  x.translate(24, 128); x.rotate(-Math.PI / 2); x.fillStyle = '#fff4d6'; x.font = 'bold 20px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let t = title; while (x.measureText(t).width > 205 && t.length > 3) t = t.slice(0, -2);
  x.fillText(t === title ? t : t.trimEnd() + '…', 0, 0); const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; return tx;
}
function bookcase(title, books) {
  const g = new THREE.Group(), W = 1.9, per = 24, T = Math.max(2, Math.min(14, Math.ceil(books.length / per)));
  const wood = M(0x5a3820), H = T * .42 + .2;
  const add = (w, hh, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), wood); m.position.set(x, y, z); g.add(m); };
  add(W + .1, H, .04, 0, H / 2, -.15); add(.05, H, .36, -W / 2 - .02, H / 2, 0); add(.05, H, .36, W / 2 + .02, H / 2, 0);
  for (let t = 0; t <= T; t++) add(W, .04, .36, 0, .15 + t * .42 - .02 + (t ? 0 : 0), 0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, .36), new THREE.MeshBasicMaterial({ map: labelTex(title, 640, 112, 54, '#e0b85a', '#2b1409') }));
  sign.position.set(0, H + .22, .02); g.add(sign);
  books.forEach((b, i) => {
    const t = Math.floor(i / per), k = i % per, col = COLORS[hash(b.title) % COLORS.length];
    const hh = .3 + (hash(b.title) % 9) / 100, side = M(col);
    const mats = [side, side, side, side, new THREE.MeshStandardMaterial({ map: spineTex(b.title, col), roughness: .7 }), side];
    const m = new THREE.Mesh(BOOK_GEO, mats); m.scale.y = hh;
    m.position.set(-W / 2 + .06 + k * .076, .15 + t * .42 + hh / 2, 0);
    m.userData.book = b; g.add(m); bookMeshes.push(m);
  });
  return g;
}
function buddha() {
  const g = new THREE.Group(), gold = M(0xd9a93a, { metalness: .8, roughness: .35, emissive: 0x4a3000, emissiveIntensity: .6 });
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, .8, 32), M(0x6a1b1b)); altar.position.y = .4; g.add(altar);
  const pink = M(0xe7a6b8, { emissive: 0x2a0d14 });
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, p = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 8), pink);
    p.scale.set(.5, .16, 1); p.position.set(Math.sin(a) * 1.45, .9, Math.cos(a) * 1.45); p.rotation.y = a; g.add(p);
  }
  const ad = (geo, x, y, z, rx = 0, rz = 0, sc) => { const m = new THREE.Mesh(geo, gold); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); if (sc) m.scale.set(...sc); g.add(m); return m; };
  ad(new THREE.SphereGeometry(1, 28, 16), 0, 1.25, 0, 0, 0, [1.25, .33, .85]);
  const lathe = new THREE.LatheGeometry([[0, 0], [.6, 0], [.66, .45], [.52, 1], [.4, 1.3], [0, 1.36]].map(p => new THREE.Vector2(...p)), 28);
  ad(lathe, 0, 1.3, 0, 0, 0, [1, 1, .75]);
  ad(new THREE.SphereGeometry(.32, 24, 16), 0, 2.95, .02); ad(new THREE.SphereGeometry(.14, 16, 12), 0, 3.25, 0);
  ad(new THREE.CylinderGeometry(.1, .08, .95, 12), -.6, 1.95, .2, .7, -.35); ad(new THREE.CylinderGeometry(.1, .08, .95, 12), .6, 1.95, .2, .7, .35);
  ad(new THREE.SphereGeometry(.14, 12, 10), 0, 1.6, .55, 0, 0, [1.6, .8, 1]);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  halo.position.set(0, 3.0, -.7); g.add(halo);
  const spot = new THREE.PointLight(0xffc65a, 18, 9); spot.position.set(0, 3.4, 1.5); g.add(spot);
  g.scale.setScalar(1.15); return g;
}
function build(sections) {
  if (world) { scene.remove(world); world.traverse(o => { if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); }
  world = new THREE.Group(); bookMeshes = []; scene.add(world);
  const per = Math.ceil(sections.length / 2); L = per * 2.4 + 10;
  const plane = (w, d, mat, x, y, z, rx, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); world.add(m); };
  const wallM = M(0x3b2314, { side: THREE.DoubleSide });
  plane(12, L + 4, M(0x6b4423), 0, 0, 2 - L / 2, -Math.PI / 2);
  plane(2.4, L + 4, M(0x7a1f1f), 0, .01, 2 - L / 2, -Math.PI / 2);
  plane(12, L + 4, M(0x2a1a0e), 0, 6.5, 2 - L / 2, Math.PI / 2);
  plane(L + 4, 6.5, wallM, -6, 3.25, 2 - L / 2, 0, Math.PI / 2); plane(L + 4, 6.5, wallM, 6, 3.25, 2 - L / 2, 0, Math.PI / 2);
  plane(12, 6.5, M(0x5a1818, { side: THREE.DoubleSide }), 0, 3.25, -L); plane(12, 6.5, wallM, 0, 3.25, 4);
  for (let z = 2; z > -L; z -= 3) { const b = new THREE.Mesh(new THREE.BoxGeometry(12, .25, .3), M(0x4a2a14)); b.position.set(0, 6.3, z); world.add(b); }
  for (let i = 0, z = 0; z > -L + 3; z -= 5, i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a3d })); l.position.set(0, 4.6, z); world.add(l);
    if (i % 2 == 0) { const p = new THREE.PointLight(0xffa860, 14, 11); p.position.set(0, 4.4, z); world.add(p); }
  }
  sections.forEach((s, i) => {
    const left = i % 2 === 0, row = Math.floor(i / 2), c = bookcase(s.title, s.books);
    c.position.set(left ? -5.55 : 5.55, 0, -2.5 - row * 2.4); c.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; world.add(c);
  });
  const b = buddha(); b.position.set(0, 0, -L + 2.6); world.add(b);
  camera.position.set(0, 1.6, 2.5); yaw = 0; pitch = 0;
}

/* ---------- vòng lặp & điều khiển ---------- */
function loop(t) {
  requestAnimationFrame(loop); if (!running) return;
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  const f = (keys.w || keys.up ? 1 : 0) - (keys.s || keys.down ? 1 : 0), r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), sp = 3.2 * dt;
  camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp; camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp;
  camera.position.x = Math.max(-4.6, Math.min(4.6, camera.position.x)); camera.position.z = Math.max(-L + 4.5, Math.min(3.2, camera.position.z));
  camera.rotation.set(pitch, yaw, 0, 'YXZ'); renderer.render(scene, camera);
}
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(mouse, camera); return ray.intersectObjects(bookMeshes, false)[0]?.object;
}
function hover(m, e) {
  if (hoverM && hoverM !== m) hoverM.material[4].emissive.set(0);
  hoverM = m; if (m) m.material[4].emissive.set(0x664411);
  tip.style.display = m ? 'block' : 'none'; renderer.domElement.style.cursor = m ? 'pointer' : 'grab';
  if (m) { tip.textContent = m.userData.book.title; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; }
}
const key = (e, v) => { const k = { w: 'w', a: 'a', s: 's', d: 'd', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'a', ArrowRight: 'd' }[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k && running) keys[k] = v; };

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight); renderer.domElement.style.cssText = 'position:fixed;inset:0;touch-action:none;cursor:grab'; document.body.prepend(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x120a05); scene.fog = new THREE.Fog(0x120a05, 8, 40);
  scene.add(new THREE.AmbientLight(0xffe2b8, .55), new THREE.HemisphereLight(0xffe0b0, 0x3a2412, .5));
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .05, 80);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  addEventListener('keydown', e => key(e, true)); addEventListener('keyup', e => key(e, false));
  const el = renderer.domElement;
  el.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; el.setPointerCapture(e.pointerId); };
  el.onpointermove = e => {
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; yaw -= dx * .004; pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * .004)); }
    else if (e.pointerType === 'mouse') hover(pick(e), e);
  };
  el.onpointerup = e => { if (drag && drag.moved < 6) { const m = pick(e); if (m) { hover(null); app.open(m.userData.book); } } drag = null; };
}
function initHud() {
  const css = h('style', { textContent: `.hud{position:fixed;z-index:4;color:#f6ecd6;font-family:Georgia,serif}.hud button{background:#6b4423cc;color:#f6ecd6;border:1px solid #e0b85a;border-radius:8px;padding:6px 11px;font:inherit;cursor:pointer}
  #tip{position:fixed;z-index:6;background:#000c;color:#fff;padding:4px 8px;border-radius:5px;font:13px Georgia;pointer-events:none;display:none;max-width:260px}
  #ov{position:fixed;inset:0;z-index:7;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:#000a;color:#f6ecd6;font:18px Georgia;text-align:center;padding:20px}
  .mv{position:fixed;bottom:16px;z-index:4;display:none;flex-direction:column;gap:8px}.mv button{width:54px;height:54px;font-size:20px}
  @media(pointer:coarse){.mv{display:flex}}.hud a{color:#e0b85a;cursor:pointer;text-decoration:underline}` });
  document.head.append(css);
  tip = h('div', { id: 'tip' }); ov = h('div', { id: 'ov' });
  crumbsEl = h('div', { className: 'hud', style: 'left:14px;top:12px;font-size:15px;text-shadow:0 1px 4px #000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:60vw' });
  musBtn = h('button', { textContent: '♪', onclick: () => { if (!app.music.toggle()) alert('Chưa có nhạc. Bỏ mp3 vào thư mục music/ và khai báo trong music/list.json'); } });
  musName = h('span', { textContent: 'Chưa có nhạc', style: 'max-width:130px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:13px' });
  const mus = h('div', { className: 'hud', style: 'right:14px;top:12px;display:flex;gap:6px;align-items:center' }, musBtn, h('button', { textContent: '⏭', onclick: () => app.music.next() }), musName,
    h('input', { type: 'range', min: 0, max: 1, step: .05, value: .4, style: 'width:70px', oninput: e => app.music.setVolume(+e.target.value) }));
  const hold = (txt, k, side) => { const b = h('button', { textContent: txt }); b.ontouchstart = b.onpointerdown = e => { e.stopPropagation(); keys[k] = true; }; b.onpointerup = b.onpointerleave = b.ontouchend = () => keys[k] = false; return b; };
  const mv = h('div', { className: 'mv', style: 'left:14px' }, hold('▲', 'up'), hold('▼', 'down'));
  const help = h('div', { className: 'hud', style: 'left:50%;bottom:10px;transform:translateX(-50%);font-size:12px;opacity:.75;text-align:center;pointer-events:none', textContent: 'Kéo để nhìn · W A S D / mũi tên để đi · bấm vào cuốn kinh để đọc' });
  document.body.append(tip, ov, crumbsEl, mus, mv, help);
}
const hud = c => { crumbsEl.textContent = ''; (c || []).forEach((t, i, a) => { if (i) crumbsEl.append('›'); crumbsEl.append(i === a.length - 1 ? h('b', { textContent: t }) : h('a', { textContent: i ? t : '🏯 ' + t, onclick: () => app.jump(i) })); });
  if (c?.length > 1) crumbsEl.prepend(h('button', { textContent: '←', onclick: () => app.back() })); };
const msg = (html, btn) => { ov.replaceChildren(h('div', { innerHTML: html })); if (btn) ov.append(btn); ov.style.display = html ? 'flex' : 'none'; };
function enter(sections, c) { U2.closeReader(); msg(''); hud(c); build(sections); keys = {}; running = true; }

export const UI = {
  init(a) { app = a; U2.init(a); document.getElementById('app').style.display = 'none'; initScene(); initHud(); requestAnimationFrame(loop); },
  loading(m) { running = false; U2.closeReader(); msg(m); },
  error(m, canBack) { running = false; msg('Lỗi: ' + m, h('button', { className: 'hud', style: 'position:static;background:#6b4423;color:#fff;border:1px solid #e0b85a;border-radius:8px;padding:8px 14px;font:inherit', textContent: canBack ? '← Quay lại' : 'Thử lại', onclick: () => canBack ? app.back() : app.home() })); },
  showHome(s, c) { enter(s, c); },
  showShelf(d, c) { enter([{ title: d.title, books: d.books }], c); },
  showReader(d, c, i) { running = false; msg(''); hud(c); U2.showReader(d, c, i); },
  setReading: i => U2.setReading(i),
  setTtsState: s => U2.setTtsState(s),
  setMusic(n, on) { if (musName) { musName.textContent = n; musBtn.textContent = on ? '⏸' : '♪'; } U2.setMusic(n, on); }
};
