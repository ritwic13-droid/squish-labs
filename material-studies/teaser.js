// squish.labs teaser director. Open index.html?debug&teaser, press "Record teaser": the page performs a scripted
// ~25 s sequence on this machine's GPU and saves it, with the lab's own sound, as squish-teaser.webm (1920 x 1080).
// Nothing here changes the lab; it drives the debug hooks (window.__ms) and draws titles over the lab's canvas.
import * as THREE from 'three';

const W = 1920, H = 1080, FPS = 60;  // landscape 16:9
const RS = Number(new URLSearchParams(location.search).get('rs')) || 1;  // render scale; below 1 only for quick tests
const ms = window.__ms, gl = document.getElementById('gl'), viewport = document.getElementById('viewport');
// squish.labs colours: the studio sweep, the lab's ink, and the study accents as the glow spectrum
const BG0 = '#241d29', BG1 = '#0a080c', INK = [238, 234, 242];
const GLOW = ['#ff5c9a', '#ff5fe6', '#7458d1', '#2f7fc0', '#0e958a'].map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const PINK = '#ff5c9a';  // Specimen signal (Darkroom)
// the product name: [main part, accent part]. The accent part is drawn in the brand pink.
const NAME = (new URLSearchParams(location.search).get('name') || 'squish.|labs').split('|');
const DISPLAY = '"Martian Mono", ui-monospace, monospace', MONO = '"Martian Mono", ui-monospace, monospace';  // the Specimen face

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const span = (t, a, b) => clamp((t - a) / (b - a)), ease = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIO = x => (x = clamp(x), x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const glowAt = u => { u = ((u % 1) + 1) % 1; const n = GLOW.length, f = u * n, i = Math.floor(f), k = f - i, a = GLOW[i], b = GLOW[(i + 1) % n]; return a.map((v, j) => Math.round(v + (b[j] - v) * k)); };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mixc = (a, b, k) => a.map((v, j) => v + (b[j] - v) * k);

// ── stage: hide the lab's interface and lock the render to exactly W x H ──
const style = document.createElement('style');
style.textContent = `.bar,.caption,.panel,.toast,#tabs{display:none!important} .panel{position:static!important}
  #viewport{position:fixed!important;inset:auto!important;left:0;top:0;z-index:1;border-radius:0!important}
  #teaser-out{position:fixed;left:0;top:0;z-index:3;background:#000}
  #teaser-ui{position:fixed;left:16px;bottom:16px;z-index:4;display:flex;gap:8px;align-items:center;font:600 13px system-ui}
  #teaser-ui button{padding:10px 14px;border-radius:999px;border:0;cursor:pointer;background:${PINK};color:#fff;font:inherit}
  #teaser-ui button.ghost{background:#2a2430} #teaser-ui span{color:#bbb;font-weight:400}`;
document.head.appendChild(style);
let sizing = false;
function lockSize() {
  if (sizing) return; sizing = true;  // the lab's resize handler runs from the event below; don't re-enter
  const cssW = Math.min(innerWidth, (innerHeight - 70) * W / H, 1600), cssH = cssW * H / W;  // leave room for the buttons below
  viewport.style.width = cssW + 'px'; viewport.style.height = cssH + 'px';
  out.style.width = cssW + 'px'; out.style.height = cssH + 'px';
  const pr = H / cssH * RS; ms.renderer.setPixelRatio(pr);
  if (ms.Q) { ms.Q.max = pr; ms.Q.dpr = pr; ms.Q.hold = 1e9; }
  dispatchEvent(new Event('resize'));
  sizing = false;
}
const out = document.createElement('canvas'); out.id = 'teaser-out'; out.width = W; out.height = H; document.body.appendChild(out);
const ctx = out.getContext('2d');
// copy the lab's picture the moment it is drawn to the screen: a WebGL canvas without preserveDrawingBuffer can be
// blank by the time another callback reads it, so reading it later in the frame sometimes gave empty frames
const grab = document.createElement('canvas'); grab.width = W; grab.height = H; const gctx = grab.getContext('2d');
{ const r = ms.renderer, orig = r.render.bind(r);
  r.render = (...a) => { orig(...a); if (r.getRenderTarget() === null) { try { gctx.clearRect(0, 0, W, H); gctx.drawImage(gl, 0, 0, W, H); } catch (e) {} } }; }
const ui = document.createElement('div'); ui.id = 'teaser-ui';
ui.innerHTML = `<button id="t-rec">Record teaser</button><button id="t-prev" class="ghost">Preview</button><span id="t-msg">Takes about 30 s. Keep this tab in front.</span>`;
document.body.appendChild(ui);
const msg = t => { document.getElementById('t-msg').textContent = t; };

// ── the line field: 1px filings on a grid and metaball outlines, in the lab's ink, lit by the glow spectrum ──
const nodes = [];  // { x, y, r }
function fieldAt(x, y) { let f = 0, gx = 0, gy = 0; for (const n of nodes) { if (n.r <= 0.5) continue; const dx = x - n.x, dy = y - n.y, d2 = dx * dx + dy * dy + 1, k = n.r * n.r / d2; f += k; gx -= 2 * k * dx / d2; gy -= 2 * k * dy / d2; } return [f, gx, gy]; }
function drawField(t, focus, strength) {
  const G = 30; ctx.lineCap = 'round';
  for (let y = G / 2; y < H; y += G) for (let x = G / 2; x < W; x += G) {
    const dx = focus.x - x, dy = focus.y - y, d = Math.hypot(dx, dy), inf = Math.max(0, 1 - d / focus.reach) * strength;
    let a = Math.atan2(dy, dx), len = 5 + inf * 8, fx = x, fy = y, al = 1;
    const [f, gx, gy] = fieldAt(x, y);
    if (f > .4) { const g = Math.hypot(gx, gy) || 1, w = Math.min(1, (f - .4) / .6); a = a * (1 - w) + Math.atan2(gx, -gy) * w; fx -= gx / g * w * 10; fy -= gy / g * w * 10; if (f > 1) al = .35; }
    ctx.strokeStyle = inf > 0 ? rgba(mixc(INK, glowAt(a / 6.283 + t * .08), Math.min(1, inf * 3)), (.05 + inf * .55) * al) : rgba(INK, .05 * al);
    ctx.lineWidth = 1.2 + inf * .8;
    ctx.beginPath(); ctx.moveTo(fx - Math.cos(a) * len, fy - Math.sin(a) * len); ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len); ctx.stroke();
  }
  // outlines where the field crosses 1 (marching squares on a 6px grid, only near the blobs)
  if (!nodes.some(n => n.r > 0.5)) return;
  const g = 6, cols = Math.ceil(W / g) + 1, rows = Math.ceil(H / g) + 1, F = new Float32Array(cols * rows);
  let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const n of nodes) if (n.r > 0.5) { x0 = Math.min(x0, n.x - n.r * 3); y0 = Math.min(y0, n.y - n.r * 3); x1 = Math.max(x1, n.x + n.r * 3); y1 = Math.max(y1, n.y + n.r * 3); }
  const i0 = Math.max(0, Math.floor(x0 / g)), i1 = Math.min(cols - 1, Math.ceil(x1 / g)), j0 = Math.max(0, Math.floor(y0 / g)), j1 = Math.min(rows - 1, Math.ceil(y1 / g));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) F[j * cols + i] = fieldAt(i * g, j * g)[0];
  const L = (p, q) => (1 - p) / (q - p || 1e-6);
  const buckets = new Map();
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const a = F[j * cols + i], b = F[j * cols + i + 1], c = F[(j + 1) * cols + i + 1], d = F[(j + 1) * cols + i];
    const k = (a >= 1) | ((b >= 1) << 1) | ((c >= 1) << 2) | ((d >= 1) << 3); if (k === 0 || k === 15) continue;
    const x = i * g, y = j * g, T = [x + g * L(a, b), y], R = [x + g, y + g * L(b, c)], B = [x + g * L(d, c), y + g], Lf = [x, y + g * L(a, d)];
    const s = { 1: [Lf, T], 2: [T, R], 3: [Lf, R], 4: [R, B], 5: [Lf, T, R, B], 6: [T, B], 7: [Lf, B], 8: [B, Lf], 9: [B, T], 10: [T, R, B, Lf], 11: [R, B], 12: [R, Lf], 13: [R, T], 14: [T, Lf] }[k];
    const dx = focus.x - (x + g / 2), dy = focus.y - (y + g / 2), inf = Math.round(Math.max(0, 1 - Math.hypot(dx, dy) / focus.reach) * strength * 16) / 16;
    const hue = Math.round((Math.atan2(dy, dx) / 6.283 + t * .08) * 40) / 40, key = inf + '|' + hue;
    let bk = buckets.get(key); if (!bk) buckets.set(key, bk = { inf, hue, s: [] }); for (let q = 0; q < s.length; q += 2) bk.s.push(s[q], s[q + 1]);
  }
  ctx.lineCap = 'butt';
  for (const { inf, hue, s } of buckets.values()) {
    ctx.strokeStyle = rgba(mixc(INK, glowAt(hue), Math.min(1, inf * 3)), .12 + inf * .85); ctx.lineWidth = 1.4 + inf * 1.4;
    ctx.beginPath(); for (let q = 0; q < s.length; q += 2) { ctx.moveTo(s[q][0], s[q][1]); ctx.lineTo(s[q + 1][0], s[q + 1][1]); } ctx.stroke();
  }
}
// a dark curved studio (a cyclorama sweep with a soft pool of light where the plinth sits) under a slow constellation
const STARS = Array.from({ length: 170 }, (_, i) => ({ x: hash(i, 1), y: hash(i, 2) * .82, z: .3 + .7 * hash(i, 3), r: .6 + 1.8 * hash(i, 4) ** 2, ph: hash(i, 5) * 6.283, c: i % 3 }));
const LINKS = []; STARS.forEach((a, i) => { const near = STARS.map((b, j) => [j, Math.hypot((a.x - b.x) * 1.78, a.y - b.y)]).filter(([j, d]) => j !== i && d < .085).sort((p, q) => p[1] - q[1]).slice(0, 2); near.forEach(([j]) => { if (j > i) LINKS.push([i, j]); }); });
const STAR_C = [[255, 214, 244], [207, 79, 136], [150, 132, 230]];
function constellationBg(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0910'); g.addColorStop(.55, '#120e18'); g.addColorStop(1, '#07060a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the curve where wall turns into floor, and the warm pool of light on it
  const pool = ctx.createRadialGradient(W * .5, H * .74, 0, W * .5, H * .74, W * .55); pool.addColorStop(0, 'rgba(70,44,78,.55)'); pool.addColorStop(.5, 'rgba(36,24,44,.35)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = 'rgba(207,79,136,.10)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(W * .5, H * 1.02, W * .78, H * .42, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.restore();
  const drift = (orbit()?.cur?.th || 0) * 60;
  const P = STARS.map(st => [((st.x * W - drift * st.z) % W + W) % W, st.y * H + Math.sin(t * .2 + st.ph) * 3 * st.z]);
  ctx.lineWidth = 1;
  for (const [i, j] of LINKS) { const a = P[i], b = P[j]; if (Math.abs(a[0] - b[0]) > W * .3) continue; ctx.strokeStyle = `rgba(150,132,230,${.07 + .05 * Math.sin(t * .7 + i)})`; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  STARS.forEach((st, i) => { const tw = .45 + .55 * (.5 + .5 * Math.sin(t * (1.2 + st.z) + st.ph)); ctx.fillStyle = rgba(STAR_C[st.c], tw * (.35 + .5 * st.z)); ctx.beginPath(); ctx.arc(P[i][0], P[i][1], st.r * (.7 + .3 * tw), 0, 6.283); ctx.fill(); });
}
function studioBg(dark = true) {
  const g = ctx.createRadialGradient(W * .42, H * .4, 0, W * .42, H * .4, Math.hypot(W, H) * .62);
  if (dark) { g.addColorStop(0, BG0); g.addColorStop(.7, BG1); } else { g.addColorStop(0, '#f1f4f2'); g.addColorStop(.7, '#e4e9e6'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ── wordmark: letters are separate so droplets can fly into each one ──
const WORD = [...NAME.join('')], WFONT = `700 150px ${DISPLAY}`;
function wordLayout(cx, cy, scale = 1) {
  ctx.font = WFONT; const widths = WORD.map(ch => ctx.measureText(ch).width * scale), tot = widths.reduce((a, b) => a + b, 0);
  let x = cx - tot / 2; return WORD.map((ch, i) => { const o = { ch, x: x + widths[i] / 2, y: cy, w: widths[i] }; x += widths[i]; return o; });
}
function drawWord(layout, show, scale = 1, alpha = 1) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${150 * scale}px ${DISPLAY}`;
  layout.forEach((l, i) => { const s = clamp(show[i] ?? 1); if (s <= 0) return; ctx.globalAlpha = alpha * s; ctx.fillStyle = i >= NAME[0].length ? PINK : rgba(INK, 1);
    ctx.save(); ctx.translate(l.x, l.y + (1 - ease(s)) * 18); ctx.scale(.9 + .1 * ease(s), .9 + .1 * ease(s)); ctx.fillText(l.ch, 0, 0); ctx.restore(); });
  ctx.restore();
}
function mono(text, x, y, { size = 26, color = rgba(INK, .8), align = 'left', track = 3, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `600 ${size}px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = track + 'px'; ctx.fillText(text.toUpperCase(), x, y); ctx.restore();
}

// ── the opening: a blob is born, reacts with itself, swells and bursts into the title (squish.labs colours) ──
function opening(t, { word = true } = {}) {
  const cx = W / 2, cy = H * .46, m = W, IMPACT = 1.55;
  studioBg(true);
  nodes.length = 0;
  const born = span(t, 0, .35), react = span(t, .35, 1.15), swell = easeIO(span(t, 1.15, IMPACT)), R = 6 + born * 10 + react * m * .05 + swell * m * .11;
  const layout = wordLayout(cx, cy, 1), show = new Array(WORD.length).fill(0);
  if (t < IMPACT) {
    for (let i = 0; i < 5; i++) { const ang = t * (2.1 + i * .7) + i * 1.26, orb = R * (.3 + .3 * Math.sin(t * 5 + i)) * react; nodes.push({ x: cx + Math.cos(ang) * orb, y: cy + Math.sin(ang) * orb, r: R * (.5 + .08 * Math.sin(t * 7 + i * 2)) }); }
    drawField(t, { x: cx, y: cy, reach: R * 2.8 + 120 }, born);
  } else {
    const k = t - IMPACT, gone = easeIO(span(k, 0, .45));
    for (let i = 0; i < 5; i++) { const ang = IMPACT * (2.1 + i * .7) + i * 1.26; nodes.push({ x: cx + Math.cos(ang) * R * .3, y: cy + Math.sin(ang) * R * .3, r: R * .5 * (1 - gone) }); }
    // six blobs pop out and drift away; droplets fly into each letter and shrink into it as it appears
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + hash(i, 4) * .7, fly = ease(span(k, 0, 1.8)), d = lerp(m * .04, m * (.48 + .2 * hash(i, 6)), fly); for (let q = 0; q < 3; q++) nodes.push({ x: cx + Math.cos(a) * d + Math.cos(a + q * 2.1) * 30, y: cy + Math.sin(a) * d + Math.sin(a + q * 2.1) * 30, r: (34 + 14 * hash(i, q)) * easeIO(span(k, 0, 1)) }); }
    if (word) layout.forEach((l, i) => { const st = .03 + i * .035, kk = span(k, st, st + .55), fly = easeIO(kk), soak = ease(span(k, st + .5, st + .85)); const bend = Math.sin(fly * Math.PI) * 60 * (hash(i, 3) - .5);
      nodes.push({ x: lerp(cx, l.x, fly) + bend, y: lerp(cy, l.y, fly) - bend * .5, r: kk <= 0 ? 0 : 34 * Math.min(1, kk * 4) * (1 - soak) }); show[i] = soak; });
    const outR = ease(span(k, 0, .9)), fade = ease(span(k, 1, 2.4));
    drawField(t, { x: cx, y: cy, reach: 220 + outR * Math.hypot(W, H) * .7 }, 1 - fade * .85);
  }
  return { layout, show };
}

// ── lab helpers ──
const cam = () => ms.camera, orbit = () => ms.orbit;
const ray = new THREE.Raycaster();
function rayAtWorld(p) { const v = new THREE.Vector3(...p).project(cam()); ray.setFromCamera(new THREE.Vector2(v.x, v.y), cam()); return ray; }
function rayAtScreen(u, v) { ray.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), cam()); return ray; }
const pressing = { on: false };
function press(target = [0, 0.75, 0.5]) { if (pressing.on) release(); const r = rayAtWorld(target); pressing.on = !!(ms.cur.onDown && ms.cur.onDown(r)); }
function release() { if (pressing.on && ms.cur.onUp) ms.cur.onUp(); pressing.on = false; }
function click(id) { const el = document.getElementById(id); if (el) el.click(); }
function openStudy(id) { release(); ms.open(id); if (ms.Q) ms.Q.hold = 1e9; }
function view(th, ph, r, snap, target) { const o = orbit(); o.follow = null; if (target) o.target.set(...target); o.goal.th = th; o.goal.ph = ph; o.goal.r = r; if (snap) Object.assign(o.cur, o.goal); }
// find the parts of the current soft toy: the PN render surface, the sim mesh, the fur shells and the small parts
function toyParts() {
  const p = { render: null, sim: null, fur: null, small: [] };
  ms.scene.traverse(o => {
    if (!o.isMesh || !o.geometry) return; const gm = o.geometry, n = gm.attributes.position?.count || 0;
    if (gm.isInstancedBufferGeometry && o.material?.isShaderMaterial) p.fur = o;
    else if (gm.type === 'IcosahedronGeometry' || (gm.type === 'BufferGeometry' && o.material?.isMeshBasicMaterial && n > 4000)) p.sim = p.sim || o;
    else if (o.material?.isMeshPhysicalMaterial && n > 50000) p.render = o;
    else if (gm.type === 'SphereGeometry' && o.parent && o.parent.type !== 'Scene') p.small.push(o);
  });
  return p;
}

// ── the fluffy build: points → spring mesh → dense surface → skin → fur shells → eyes → squish ──
let build = null;
function buildStart() {
  const p = toyParts(); if (!p.render) return null;
  ms.renderer.localClippingEnabled = true;
  const host = p.render.parent, sGeo = (p.sim || p.render).geometry;
  // each layer gets a band of world height it is drawn in: from the plinth up to its growth front, and above the
  // front of the layer growing over it (so the layer underneath stays visible only where it isn't covered yet)
  const band = () => [new THREE.Plane(new THREE.Vector3(0, -1, 0), -1), new THREE.Plane(new THREE.Vector3(0, 1, 0), 1)];
  const mk = (geo, mat) => { const o = mat.isPointsMaterial ? new THREE.Points(geo, mat) : new THREE.Mesh(geo, mat); o.frustumCulled = false; o.position.copy(p.render.position); o.quaternion.copy(p.render.quaternion); o.scale.copy(p.render.scale); host.add(o); return o; };
  const L = {
    pts: mk(sGeo, new THREE.PointsMaterial({ color: PINK, size: 0.011, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, clippingPlanes: band() })),
    wireSim: mk(sGeo, new THREE.MeshBasicMaterial({ color: '#ff5fe6', wireframe: true, transparent: true, opacity: .6, clippingPlanes: band() })),
    wireDense: mk(p.render.geometry, new THREE.MeshBasicMaterial({ color: '#7458d1', wireframe: true, transparent: true, opacity: .4, clippingPlanes: band() })),
  };
  // the skin is the lab's own material, clipped while it grows and restored afterwards
  const skin = p.render.material; skin.clippingPlanes = band().slice(0, 1); skin.clipShadows = true; skin.needsUpdate = true;
  // a glowing ring rides each growth front
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 128), new THREE.MeshBasicMaterial({ color: '#ffd6f4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = Math.PI / 2; ms.scene.add(ring);
  p.render.geometry.computeBoundingBox(); const bb = p.render.geometry.boundingBox.clone().applyMatrix4(p.render.matrixWorld);
  const furN = p.fur ? p.fur.geometry.instanceCount : 0;
  const scales = p.small.map(o => o.scale.clone());
  return { p, L, skin, ring, y0: bb.min.y - 0.02, y1: bb.max.y + 0.04, r: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5, furN, host, scales };
}
// growth windows (seconds into the build): each layer rises from the plinth to the top over its window
const GROW = { pts: [0, 1.2], wireSim: [.8, 2.0], wireDense: [1.7, 2.9], skin: [2.6, 3.9] }, FUR = [3.9, 5.4], EYES = 5.3;
function buildSet(b, s) {
  if (!b || !b.p) return 0;
  const { p, L, skin, ring, y0, y1, furN } = b, front = k => lerp(y0, y1, easeIO(span(s, GROW[k][0], GROW[k][1])));
  const order = ['pts', 'wireSim', 'wireDense', 'skin'];
  order.forEach((k, i) => {
    const top = front(k), next = order[i + 1] ? front(order[i + 1]) : -1e9;
    const planes = k === 'skin' ? skin.clippingPlanes : L[k].material.clippingPlanes;
    planes[0].constant = top; if (planes[1]) planes[1].constant = -next;  // keep y < top, and y > next layer's front
    if (L[k]) L[k].visible = s >= GROW[k][0];
  });
  p.render.visible = s >= GROW.skin[0];
  // the ring follows whichever front is moving right now
  const moving = [...order].reverse().find(k => s >= GROW[k][0] && s <= GROW[k][1] + .05);
  ring.visible = !!moving;
  if (moving) { const y = front(moving), f = clamp((y - y0) / (y1 - y0)), rr = b.r * Math.sqrt(Math.max(0, 1 - Math.pow(f * 2 - 1, 2))) * 1.02 + 0.02;
    ring.position.set(p.render.getWorldPosition(new THREE.Vector3()).x, y, p.render.getWorldPosition(new THREE.Vector3()).z); ring.scale.setScalar(Math.max(0.02, rr));
    ring.material.color.set({ pts: PINK, wireSim: '#ff5fe6', wireDense: '#7458d1', skin: '#ffd6f4' }[moving]); }
  const shells = Math.round(furN * easeIO(span(s, FUR[0], FUR[1])));
  if (p.fur) p.fur.geometry.instanceCount = s < FUR[0] ? 0 : Math.max(1, shells);
  p.small.forEach((o, i) => { const k = easeIO(span(s, EYES + i * .06, EYES + .3 + i * .06)); o.visible = k > 0; o.scale.copy(b.scales[i]).multiplyScalar(Math.max(1e-3, k * (1 + .25 * Math.sin(k * Math.PI)))); });
  return shells;
}
function buildEnd(b) {
  if (!b || !b.p) return;
  for (const o of Object.values(b.L)) { b.host.remove(o); o.material.dispose(); }
  ms.scene.remove(b.ring); b.ring.geometry.dispose(); b.ring.material.dispose();
  b.skin.clippingPlanes = null; b.skin.needsUpdate = true; b.p.render.visible = true;
  if (b.p.fur) b.p.fur.geometry.instanceCount = b.furN;
  b.p.small.forEach((o, i) => { o.visible = true; o.scale.copy(b.scales[i]); });
}

// ── poppy toy changes: the old toy swells and bursts like a bubble, the new one drops onto the plinth like a blob of jelly ──
// The toy's group stands on the plinth at y = 0, so scaling it about its origin squashes it against the plinth top.
const POP = .16, LAND = .18;  // pop-out length; the drop-in lands this long after the shot starts
const toyRoot = () => ms.scene.children.find(o => o.type === 'Group' && o.children.length);
function setRoot(sx, sy, y = 0) { const r = ms.cur?.id === 'squish' && toyRoot(); if (!r) return; r.scale.set(sx, sy, sx); r.position.y = y; }
function resetRoot() { setRoot(1, 1, 0); }
// 0 → 1 over the pop: a quick swell, then gone, sinking a little as it goes
function popOut(u) { if (u < .45) { const e = 1 + .12 * ease(u / .45); setRoot(e, e * 1.03); } else { const e = 1.12 * (1 - easeIO((u - .45) / .55)); setRoot(Math.max(1e-3, e * 1.08), Math.max(1e-3, e * .9), -.12 * (u - .45)); } }
// k seconds into the shot: falls stretched from above, hits at LAND, then a damped squash-and-stretch settles it
function dropIn(k) {
  if (k < LAND) { const u = k / LAND; setRoot(.78, 1.3, 2.4 * (1 - u * u)); return; }
  const q = k - LAND, w = -.42 * Math.exp(-q * 7) * Math.cos(q * 26); setRoot(1 / Math.sqrt(Math.max(.2, 1 + w)), Math.max(.2, 1 + w));
}
const toScreen = p => { const v = new THREE.Vector3(...p).project(cam()); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
const bursts = [];  // 2D drops and rings drawn over the lab picture
function popBurst() {
  const [x, y] = toScreen([0, .6, 0]);
  bursts.push({ ring: 1, x, y, r: 60, vr: 1900, age: 0, life: .28, c: [255, 214, 244], fy: 1 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + hash(i, 7), v = 500 + 700 * hash(i, 8);
    bursts.push({ x: x + Math.cos(a) * 70, y: y + Math.sin(a) * 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, r: 4 + 9 * hash(i, 9), age: 0, life: .35 + .25 * hash(i, 6), c: glowAt(i / 18) }); }
}
function splash() {
  const [x, y] = toScreen([0, 0, 0]), [xr] = toScreen([1.6, 0, 0]), [, yr] = toScreen([0, 0, 1.6]), rx = Math.abs(xr - x) || 300, fy = clamp(Math.abs(yr - y) / rx, .15, .6);
  bursts.push({ ring: 1, x, y, r: rx * .6, vr: rx * 2.4, age: 0, life: .32, c: [255, 95, 230], fy });  // starts at the toy's footprint
  bursts.push({ ring: 1, x, y, r: rx * .5, vr: rx * 1.6, age: 0, life: .4, c: [116, 88, 209], fy });
  for (let i = 0; i < 14; i++) { const a = (i / 13 - .5) * 2.6, side = i % 2 ? 1 : -1, v = 450 + 600 * hash(i, 3);
    bursts.push({ x: x + side * rx * .6, y, vx: side * Math.cos(a * .4) * v, vy: -Math.abs(Math.sin(a)) * v - 250, r: 3 + 7 * hash(i, 4), age: 0, life: .45, c: glowAt(.1 + i / 30), g: 2600 }); }
}
function drawBursts(dt) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.age += dt; const f = b.age / b.life; if (f >= 1) { bursts.splice(i, 1); continue; }
    if (b.ring) { b.r += b.vr * dt * (1 - f); ctx.strokeStyle = rgba(b.c, .8 * (1 - f)); ctx.lineWidth = 6 * (1 - f) + 1; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * b.fy, 0, 0, 6.283); ctx.stroke(); continue; }
    b.vy += (b.g || 1400) * dt; b.vx *= 1 - dt * 2; b.x += b.vx * dt; b.y += b.vy * dt;
    // a drop stretches along its motion, like a liquid bead
    const sp = Math.hypot(b.vx, b.vy), st = 1 + Math.min(1.6, sp / 900), rr = b.r * (1 - f * .6);
    ctx.fillStyle = rgba(b.c, .9 * (1 - f)); ctx.beginPath(); ctx.ellipse(b.x, b.y, rr * st, rr / Math.sqrt(st), Math.atan2(b.vy, b.vx), 0, 6.283); ctx.fill();
    ctx.fillStyle = rgba([255, 255, 255], .6 * (1 - f)); ctx.beginPath(); ctx.arc(b.x - rr * .3, b.y - rr * .3, rr * .3, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
// a fluid hole that opens from the centre over a dark fill: used to bring in the opening's black
function wipe(k, dur) {
  if (k >= dur) return; const R = easeIO(k / dur) * Math.hypot(W, H) * .62; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
  for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283, r = R * (1 + .06 * Math.sin(a * 5 + k * 9)); i ? ctx.lineTo(W / 2 + Math.cos(a) * r, H * .5 + Math.sin(a) * r) : ctx.moveTo(W / 2 + Math.cos(a) * r, H * .5 + Math.sin(a) * r); }
  ctx.fillStyle = '#0b0910'; ctx.fill('evenodd'); ctx.restore();
}

// ── the score: shots on the teaser clock (seconds) ──
const FLASH = [['bao', 'Bao bun'], ['mochi', 'Mochi ice cream'], ['iced', 'Iced donut'], ['axolotl', 'Axolotl'], ['capybara', 'Capybara'], ['grape', 'Mesh grape ball'], ['crackball', 'Cracking ball'], ['slime', 'Slime'], ['beaver', 'Bubble beaver']];
const FL0 = 14.4, FLD = .55;
const SHOTS = [
  { a: 0, b: 3.6, kind: 'open' },
  { a: 3.6, b: 10.8, kind: 'fluff' },
  { a: 10.8, b: 14.4, kind: 'jelly' },
  ...FLASH.map(([id, name], i) => ({ a: FL0 + i * FLD, b: FL0 + (i + 1) * FLD, kind: 'flash', id, name, i })),
];
const OUT0 = SHOTS[SHOTS.length - 1].b, END = OUT0 + 4.2;
SHOTS.push({ a: OUT0, b: END, kind: 'close' });

// the squish study's floating dust reads as clutter behind the build; the teaser hides it
function hideDust() { ms.scene.children.forEach(o => { if (o.isPoints) o.visible = false; }); }
// the toy shots: drop in at the start, burst at the end
function toyIO(s, k) {
  const len = s.b - s.a;
  if (s.kind !== 'fluff') { if (k < 1.2) dropIn(k); if (!s.landed && k >= LAND) { s.landed = true; splash(); } }
  if (k >= len - POP) { popOut(clamp((k - (len - POP)) / POP)); if (!s.popped && k >= len - POP * .45) { s.popped = true; popBurst(); } }
  else if (s.kind === 'fluff' || k >= 1.2) resetRoot();
}
let cur = null, tt = 0, running = false, recorder = null, chunks = [], last = 0, labT = 0;
function enter(s) {
  // close-ups: the camera sits tight on the subject and pushes in slowly through each shot (see during())
  if (s.kind === 'fluff') { openStudy('squish'); click('squish-toy-fluff'); resetRoot(); hideDust(); view(0.2, 1.18, 6.4, true, [0, 0.55, 0]); build = buildStart(); }
  if (s.kind === 'jelly') { buildEnd(build); build = null; click('squish-toy-filled'); dropIn(0); view(1.05, 1.16, 5.6, true, [0.45, 0.4, 0]); }  // from the side with the jam hole
  if (s.kind === 'flash') { release(); click('squish-toy-' + s.id); dropIn(0); view(0.4 + s.i * .5, 1.16, 5.8, true, [0, 0.55, 0]); }
  if (s.kind === 'close') release();
  s.popped = s.landed = false; labT = 0;
}
function during(s, k, dt) {  // k: seconds into the shot
  const o = orbit();
  if (s.kind === 'fluff') {
    o.goal.th += dt * .22; o.goal.r = lerp(6.4, 5.6, easeIO(span(k, 0, 7)));
    const st = buildSet(build || {}, k) ?? 0; toyIO(s, k);
    if (k > 5.7 && k < 5.75 && !pressing.on) press([0.1, 0.9, 0.6]);
    if (k > 6.2 && pressing.on) release();
    if (k > 6.6 && k < 6.65 && !pressing.on) press([-0.2, 0.8, 0.6]);
    return st;
  }
  if (s.kind === 'jelly') { toyIO(s, k); o.goal.th += dt * .06; o.goal.r = lerp(5.6, 4.8, easeIO(span(k, 0, 3.6))); if (k > .5 && !pressing.on && k < 3.0) press([0.15, 0.85, 0.25]); if (k > 3.0 && pressing.on) release(); }
  if (s.kind === 'flash') { toyIO(s, k); if (k > .3 && k < .34 && !pressing.on) press([0, 0.8, 0.5]); if (k > FLD - POP - .02 && pressing.on) release(); o.goal.th += dt * .5; o.goal.r *= 1 - dt * .2; }
}
const STAGE_LABELS = [[0, '01', 'points', s => '8,412 vertices'], [.8, '02', 'spring mesh', s => 'grows over the points'], [1.7, '03', 'smooth surface', s => '210k PN triangles'],
  [2.6, '04', 'skin', s => 'grows over the surface'], [3.9, '05', 'fur', s => `${s} / 64 shells`], [5.3, '06', 'squish', s => 'press to squeeze']];
function hud(s, k, extra) {
  // brand bug top-left, shot label bottom-left
  ctx.save(); ctx.font = `600 36px ${DISPLAY}`; ctx.textBaseline = 'top';
  const ink = INK;  // every shot now sits on the dark constellation studio
  ctx.shadowColor = 'rgba(5,4,8,.55)'; ctx.shadowBlur = 18;
  ctx.fillStyle = rgba(ink, .95); ctx.fillText(NAME[0], 56, 52); const w = ctx.measureText(NAME[0]).width; ctx.fillStyle = PINK; ctx.fillText(NAME[1] || '', 56 + w, 52); ctx.restore();
  let no = '', title = '', sub = '';
  if (s.kind === 'fluff') { const L = [...STAGE_LABELS].reverse().find(l => k >= l[0]); no = L[1]; title = L[2]; sub = L[3](extra); }
  if (s.kind === 'jelly') { no = '07'; title = 'jelly donut'; sub = k > 1.2 ? 'jam with real volume' : 'squeeze and hold'; }
  if (s.kind === 'flash') { no = String(8 + s.i).padStart(2, '0'); title = s.name; sub = 'squish shelf'; }
  if (!title) return;
  const inA = s.kind === 'flash' ? 1 : ease(span(k, 0, .25));
  ctx.save(); ctx.globalAlpha = inA; ctx.shadowColor = 'rgba(5,4,8,.55)'; ctx.shadowBlur = 18;
  mono(no, 56, H - 132, { size: 24, color: PINK, track: 2 });
  ctx.font = `700 56px ${DISPLAY}`; ctx.fillStyle = rgba(ink, .96); ctx.textBaseline = 'middle'; ctx.fillText(title, 56, H - 88);
  mono(sub, 56 + 4, H - 40, { size: 20, color: rgba(ink, .6), track: 2 });
  ctx.restore();
}
function frame(now) {
  if (!running) return; requestAnimationFrame(frame);
  const dt = Math.min(1 / 30, (now - (last || now)) / 1000); last = now; tt += dt;
  const s = SHOTS.find(x => tt >= x.a && tt < x.b) || SHOTS[SHOTS.length - 1];
  if (s !== cur) { cur = s; enter(s); }
  const k = tt - s.a; labT += dt;
  ctx.clearRect(0, 0, W, H);
  if (s.kind === 'open') { const { layout, show } = opening(tt); drawWord(layout, show); mono('a lab of things you want to squeeze', W / 2, H * .46 + 132, { size: 24, align: 'center', alpha: ease(span(tt, 2.5, 3.1)) * .75 });
    if (tt > 3.25) { const f = easeIO(span(tt, 3.25, 3.6)); ctx.fillStyle = rgba([10, 8, 12], f); ctx.fillRect(0, 0, W, H); } }
  else if (s.kind === 'close') {
    // the field and a new blob come up over the last shot as it fades out, then burst into the title again
    const back = easeIO(span(k, 0, .6)), { layout, show } = opening(clamp(k - .3, 0, 9) * 1.05);
    if (back < 1) { ctx.globalAlpha = 1 - back; ctx.drawImage(grab, 0, 0, W, H); ctx.globalAlpha = 1; }
    drawWord(layout, show); const a = ease(span(k, 2.3, 2.9));
    mono('coming soon', W / 2, H * .46 + 132, { size: 26, align: 'center', color: PINK, alpha: a });
    mono('ritwicdesign.com', W / 2, H * .46 + 178, { size: 24, align: 'center', alpha: a * .8 });
  } else {
    constellationBg(tt);
    ctx.drawImage(grab, 0, 0, W, H);
    drawBursts(dt);
    let extra = 0; extra = during(s, k, dt) || 0;
    // fluid wipe: out of the opening's black into the build
    if (s.kind === 'fluff') wipe(k, .9);
    hud(s, k, extra);
  }
  if (tt >= END) stop();
}
async function start(rec) {
  try { await document.fonts.load(`800 168px ${DISPLAY}`); await document.fonts.load(`600 24px ${MONO}`); } catch (e) {}
  lockSize(); window.Sound?.ensure?.(); ms.Sound?.ensure?.();
  tt = 0; last = 0; cur = null; running = true; chunks = []; bursts.length = 0;
  if (rec) {
    const stream = out.captureStream(FPS), S = ms.Sound;
    if (S && S.ctx && S.master) { const dest = S.ctx.createMediaStreamDestination(); S.master.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); }
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 24e6 });
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'squish-teaser.webm'; a.click(); msg('Saved squish-teaser.webm to Downloads.'); };
    recorder.start(250); msg('Recording… keep this tab in front.');
  } else msg('Previewing…');
  requestAnimationFrame(frame);
}
function stop() { running = false; release(); resetRoot(); bursts.length = 0; buildEnd(build); build = null; if (recorder && recorder.state !== 'inactive') recorder.stop(); else msg('Preview done.'); recorder = null; }
document.getElementById('t-rec').onclick = () => start(true);
document.getElementById('t-prev').onclick = () => start(false);
lockSize(); addEventListener('resize', () => { if (!running) lockSize(); });
studioBg(true); { const { layout } = opening(4); drawWord(layout, new Array(WORD.length).fill(1)); }
window.__teaser = { start, stop, get t() { return tt; }, SHOTS, seek(t) { tt = t; } };
