// Curve audit: are curved outlines really curved? (Round L3b builds the silhouette check; Round V1 adds the per-mesh geometry audit.)
//
//   node material-studies/tools/curve-audit.mjs selftest              proves the check on known shapes (must pass before trusting it)
//   node material-studies/tools/curve-audit.mjs landing [--port 3000]  every 10th frame of the landing sequence at 2560x1440 and 3840x2160
//   node material-studies/tools/curve-audit.mjs crops <before|after> [--port 3000]   400% crops of the landing's edges at both sizes
//
// Silhouette check: the image's brightness is traced at a fixed level with marching squares (sub-pixel, interpolated); the landing is
// rendered in its coverage view for this (white inside, black outside, the edge pixels' exact coverage), traced at 0.5, so lighting
// near an edge (a highlight reaching the outline) can't move the traced line. The outlines
// are resampled every pixel of arc length, and at every point the turn over 4 px is compared with its neighbourhood (+-8 px):
//   corner      (after 1.5 px smoothing of the traced points) the turn over 3 px minus a third of the turn over 9 px (averaged over 5 px) exceeds 0.046 rad: a smooth curve turns
//               three times as much over 9 px, a vertex turns the same, so this is ~2/3 of a facet's corner angle and ~0 on a curve
//               (a polygon at the 0.5 px sagitta limit turns ~0.1 rad per vertex at R 400; aliased stair-steps far more)
//   straight    the outline stays within 0.1 px of a chord for longer than a curve of the surrounding radius could (3 x the chord such a
//               circle keeps within 0.1 px), on an outline that bends there (radius under 2000 px): a flat facet or a clipped side
// Outlines shorter than 24 px (the loading points, 4 px analytic dots) are skipped; their roundness is checked in the 400% crops.
// Needs the lab served on --port (default 3000) and playwright-core (PW=file:///.../playwright-core/index.mjs if not installed here).
// Reports to material-studies/shots/curve-audit/ (git-ignored): index.html with every failing frame's 400% crop, and the summary line.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), ms = path.resolve(here, '..');
const mode = process.argv[2], port = process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '3000';
const { chromium } = await import(process.env.PW || 'playwright-core');
const out = path.join(ms, 'shots', 'curve-audit'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--window-position=-3000,0'] });

// ── the analysis, run inside a page (it has canvas decoding and is fast enough for 4K frames) ──
const ANALYZE = `(async (b64, iso, region, keepStraight) => {
  const CORNER = 0.046;  // perfect anti-aliased curves reach ~0.038 (the trace steps where an edge crosses a pixel row); a 0.6 px-sagitta polygon ~0.05
  const img = new Image(); await new Promise((r, e) => { img.onload = r; img.onerror = e; img.src = 'data:image/png;base64,' + b64; });
  const W = img.width, H = img.height, c = new OffscreenCanvas(W, H), g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data, f = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) f[i] = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255 - iso;
  const [x0, y0, x1, y1] = region || [0, 0, W, H];
  // marching squares: segments between interpolated edge crossings, linked into outlines through their shared edge keys
  const segs = new Map(), key = (x, y, dir) => (y * W + x) * 2 + dir;  // dir 0: the edge right of (x,y); 1: the edge below it
  const pt = (x, y, dir) => { const a = f[y * W + x], b = dir ? f[(y + 1) * W + x] : f[y * W + x + 1], t = a / (a - b); return dir ? [x, y + t] : [x + t, y]; };
  const link = (k1, k2) => { (segs.get(k1) || segs.set(k1, []).get(k1)).push(k2); (segs.get(k2) || segs.set(k2, []).get(k2)).push(k1); };
  for (let y = Math.max(0, y0); y < Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W - 1, x1); x++) {
    const a = f[y * W + x] > 0, b = f[y * W + x + 1] > 0, cc = f[(y + 1) * W + x + 1] > 0, dd = f[(y + 1) * W + x] > 0, m = a | b << 1 | cc << 2 | dd << 3;
    if (m === 0 || m === 15) continue;
    const T = key(x, y, 0), R = key(x + 1, y, 1), B = key(x, y + 1, 0), L = key(x, y, 1);
    const E = [[], [L, T], [T, R], [L, R], [R, B], [L, T, R, B], [T, B], [L, B], [L, B], [T, B], [T, R, L, B], [R, B], [L, R], [T, R], [L, T]][m];
    for (let i = 0; i < E.length; i += 2) link(E[i], E[i + 1]);
  }
  const pos = k => { const dir = k & 1, i = k >> 1; return pt(i % W, Math.floor(i / W), dir); };
  const seen = new Set(), loops = [];
  for (const k of segs.keys()) {
    if (seen.has(k)) continue;
    const loop = []; let prev = -1, cur = k;
    while (cur !== undefined && !seen.has(cur)) { seen.add(cur); loop.push(pos(cur)); const nx = segs.get(cur).find(n => n !== prev && !seen.has(n)); prev = cur; cur = nx; }
    if (loop.length > 8) loops.push(loop);
  }
  // per outline: resample at 1 px, then the corner and straight-run tests
  const res = []; let worst = 0;
  for (const L0 of loops) {
    let len = 0; for (let i = 1; i < L0.length; i++) len += Math.hypot(L0[i][0] - L0[i - 1][0], L0[i][1] - L0[i - 1][1]);
    if (len < 24) continue;
    const closed = Math.hypot(L0[0][0] - L0.at(-1)[0], L0[0][1] - L0.at(-1)[1]) < 1.5;
    // resample at an even step close to 1 px (closed outlines include their closing segment, so the seam is no different)
    const L1 = closed ? [...L0, L0[0]] : L0, cum = [0]; for (let i = 1; i < L1.length; i++) cum.push(cum[i - 1] + Math.hypot(L1[i][0] - L1[i - 1][0], L1[i][1] - L1[i - 1][1]));
    const tot = cum.at(-1), N = Math.max(2, Math.round(tot)), stepL = tot / N, P = []; let seg = 1;
    for (let k = 0; k < (closed ? N : N + 1); k++) { const d = k * stepL; while (seg < L1.length - 1 && cum[seg] < d) seg++; const a = L1[seg - 1], b = L1[seg], t = (d - cum[seg - 1]) / ((cum[seg] - cum[seg - 1]) || 1); P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    const n0 = P.length, raw = i => P[closed ? (i % n0 + n0) % n0 : Math.min(n0 - 1, Math.max(0, i))], G = [-3, -2, -1, 0, 1, 2, 3].map(j => Math.exp(-j * j / (2 * 1.5 * 1.5))), Gs = G.reduce((a, b) => a + b);
    const Q = P.map((_, i) => { let x = 0, y = 0; for (let j = -3; j <= 3; j++) { const q = raw(i + j); x += q[0] * G[j + 3]; y += q[1] * G[j + 3]; } return [x / Gs, y / Gs]; });
    const n = Q.length, s = 3, Wn = 9, at = i => Q[closed ? (i % n + n) % n : Math.min(n - 1, Math.max(0, i))];
    const turnAt = (i, h) => { const p = at(i), a = at(i - h), b = at(i + h), ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1]; return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); };
    const turn = new Float32Array(n), t3 = new Float32Array(n), t9 = new Float32Array(n);
    for (let i = 0; i < n; i++) { t3[i] = turnAt(i, 3); t9[i] = turnAt(i, 9); turn[i] = Math.abs(t3[i]); }
    // the surrounding bend with its direction: a wave's inflection (locally straight on any smooth wavy outline) is not a facet
    const signedMean = (i, w) => { let t = 0, k = 0; for (let j = -w; j <= w; j++) { const q = closed ? ((i + j) % n + n) % n : i + j; if (q < 0 || q >= n) continue; t += t3[q]; k++; } return k ? t / k : 0; };
    const mean = (i, w) => { let t = 0, k = 0; for (let j = -w; j <= w; j++) { if (!j) continue; const q = closed ? ((i + j) % n + n) % n : i + j; if (q < 0 || q >= n) continue; t += turn[q]; k++; } return k ? t / k : 0; };
    const lo = closed ? 0 : 9 + Wn, hi = closed ? n : n - 9 - Wn;
    let corner = 0, cornerAt = null, straight = 0, straightAt = null;
    // a corner turns the same over 3 px as over 9 px (its turn sits at one vertex); a smooth curve turns three times as much over 9 px
    const avg = (arr, i) => { let t = 0; for (let j = -2; j <= 2; j++) t += arr[closed ? ((i + j) % n + n) % n : Math.min(n - 1, Math.max(0, i + j))]; return t / 5; };
    for (let i = lo; i < hi; i++) { const r = Math.abs(avg(t3, i) - avg(t9, i) / 3); if (r > CORNER && r > corner) { corner = r; cornerAt = at(i); } }
    // straight runs: grow a chord while every point stays within 0.1 px of it
    for (let i = lo; i < hi; ) {
      let j = i + 2;
      for (; j < (closed ? i + n - 1 : hi); j++) { const a = at(i), b = at(j), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); let ok = true;
        for (let k = i + 1; k < j; k++) { const p = at(k); if (Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l > 0.1) { ok = false; break; } } if (!ok) break; }
      const runL = j - 1 - i, mid = i + (runL >> 1), kappa = Math.abs(signedMean(mid, 20)) / (2 * s), R = kappa > 1e-6 ? 1 / kappa : 1e9, allow = 3 * 2 * Math.sqrt(2 * R * 0.1);
      const p0 = at(mid), kept = (keepStraight || []).some(r => p0[0] > r[0] && p0[0] < r[2] && p0[1] > r[1] && p0[1] < r[3]);
      if (!kept && R < 2000 && runL > Math.max(6, allow) && runL - allow > straight) { straight = runL - allow; straightAt = at(mid); }
      i = Math.max(i + 1, j - 1);
    }
    const bad = corner > 0 || straight > 0, box = P.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
    res.push({ len: Math.round(len), closed, corner: +corner.toFixed(3), straight: +straight.toFixed(1), at: cornerAt || straightAt, bad, box: box.map(Math.round) });
    worst = Math.max(worst, corner);
  }
  return { W, H, outlines: res, fails: res.filter(r => r.bad) };
})`;
let tool = null;
async function analyze(buf, iso = 0.42, region, keepStraight) { if (!tool) { tool = await browser.newPage(); await tool.goto('about:blank'); } return tool.evaluate(`${ANALYZE}(${JSON.stringify(buf.toString('base64'))}, ${iso}, ${JSON.stringify(region || null)}, ${JSON.stringify(keepStraight || null)})`); }
async function crop400(page, file, clip) {  // nearest-neighbour 400%: every real pixel shown as a 4x4 block
  const b = await page.screenshot({ clip }); const t = tool || (tool = await browser.newPage());
  const png = await t.evaluate(async b64 => { const i = new Image(); await new Promise(r => { i.onload = r; i.src = 'data:image/png;base64,' + b64; }); const c = document.createElement('canvas'); c.width = i.width * 4; c.height = i.height * 4; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1]; }, b.toString('base64'));
  fs.writeFileSync(file, Buffer.from(png, 'base64'));
}

// ── selftest: smooth shapes must pass, faceted and aliased ones must fail. The shapes are drawn with exact coverage (64 samples a
//    pixel, like the landing shader's analytic edge), so the test calibrates on the kind of edge it judges ──
async function selftest() {
  const p = await browser.newPage(); await p.goto('about:blank');
  const poly = (N, R) => `(x, y) => { const a = Math.atan2(y, x), k = Math.PI / ${N}, t = ((a % (2 * k)) + 2 * k) % (2 * k) - k; return Math.hypot(x, y) * Math.cos(t) < ${R} * Math.cos(k); }`;
  const cases = [
    ['circle r40', false, '(x, y) => x * x + y * y < 1600', 50],
    ['circle r300', false, '(x, y) => x * x + y * y < 90000', 310],
    ['circle r470', false, '(x, y) => x * x + y * y < 470 * 470', 480],
    ['ellipse 450x160 tilted', false, '(x, y) => { const c = Math.cos(0.3), s = Math.sin(0.3), u = x * c + y * s, v = -x * s + y * c; return (u / 450) ** 2 + (v / 160) ** 2 < 1; }', 460],
    ['blob', false, '(x, y) => { const a = Math.atan2(y, x); return Math.hypot(x, y) < 300 + 40 * Math.sin(3 * a) + 25 * Math.sin(5 * a + 1); }', 370],
    ['rounded rect 224x56 r16 (the Start key: straight sides declared)', false, '(x, y) => { const qx = Math.abs(x) - 112 + 16, qy = Math.abs(y) - 28 + 16; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 16 < 0; }', 120],
    ['polygon N24 r300 (sagitta 2.6 px)', true, poly(24, 300), 310],
    ['polygon N48 r400 (sagitta 0.86 px)', true, poly(48, 400), 410],
    ['polygon N12 r60', true, poly(12, 60), 70],
    ['aliased circle r200', true, '(x, y) => x * x + y * y < 40000', 210, 1],
    ['circle clipped flat', true, '(x, y) => x * x + y * y < 90000 && x < 100', 310],
  ];
  let ok = 0; const rows = [];
  for (const [name, shouldFail, inside, ext, ss = 8] of cases) {
    const keep = name.includes('rounded rect') ? [[600 - 120, 500 - 36, 600 + 120, 500 + 36]] : null;
    const b64 = await p.evaluate(([src, ext, ss]) => {
      const f = (0, eval)(src), W = 1200, H = 1000, cx = 600.37, cy = 500.21, c = new OffscreenCanvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let cov = 0; const o = (y * W + x) * 4;
        if (Math.abs(x - cx) <= ext + 2 && Math.abs(y - cy) <= ext + 2) for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) cov += f(x + (i + 0.5) / ss - cx, y + (j + 0.5) / ss - cy) ? 1 : 0;
        cov /= ss * ss; im.data[o] = 17 + (255 - 17) * cov; im.data[o + 1] = 17 + (92 - 17) * cov; im.data[o + 2] = 17 + (154 - 17) * cov; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0); return c.convertToBlob().then(b => b.arrayBuffer()).then(a => { let s = ''; const u = new Uint8Array(a); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); });
    }, [inside, ext, ss]);
    const r = await analyze(Buffer.from(b64, 'base64'), 0.42, null, keep), failed = r.fails.length > 0, pass = failed === shouldFail;
    if (!pass && r.fails[0]) rows.push('     at ' + r.fails[0].at.map(v => Math.round(v - (v > 550 && v < 650 ? 600.37 : 500.21))).join(','));
    if (pass) ok++; rows.push(`${pass ? 'ok  ' : 'BAD '} ${name}: expected ${shouldFail ? 'fail' : 'pass'}, got ${failed ? 'fail' : 'pass'} (worst corner ${Math.max(0, ...r.outlines.map(o => o.corner))}, straight ${Math.max(0, ...r.outlines.map(o => o.straight))})`);
  }
  console.log(rows.join('\n')); console.log(`selftest: ${ok}/${cases.length}`);
  return ok === cases.length;
}

// ── the landing timeline, frame by frame (60 fps; the same curves the renderer uses) ──
const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
function timeline() {
  const F = []; let loopT = 0; const step = 1 / 60;
  const push = (phase, st) => F.push({ phase, i: F.length, ...st });
  for (let k = 0; k < 72; k++) { push('loading', { pd: k / 71, loopT, bud: 0, out: 0 }); loopT = (loopT + step) % 10; }               // 0 to 100% at the shown rate
  for (let k = 0; k < 120; k++) { push('ready + bud', { pd: 1, loopT, bud: sm(((k / 60) - 0.35) / 1.3), out: 0 }); loopT = (loopT + step) % 10; }
  for (let k = 0; k < 600; k++) { push('loop', { pd: 1, loopT, bud: 1, out: 0 }); loopT = (loopT + step) % 10; }                      // one whole 10 s loop
  for (let k = 0; k <= 120; k++) { push('exit', { pd: 1, loopT, bud: 1, out: Math.min(1, k / 120) }); loopT = (loopT + step) % 10; }  // Start: into the key, the fall, the pool and its ripples into the plinth (2 s)
  const every = +(process.env.EVERY || 10);  // EVERY=n: a quicker spot check during fixes; the round's result is always EVERY=10
  const only = process.env.PHASE;  // PHASE='ready + bud': only that part of the timeline
  return F.filter((f, i) => (i % every === 0 || f.phase === 'exit' && i === F.length - 1) && (!only || f.phase === only));
}

const ISO = +(process.env.ISO || 0.5);  // the landing is audited on its coverage view: 0.5 is exactly the silhouette
async function landing() {
  if (!(await selftest())) { console.error('selftest failed: the check is not trustworthy'); process.exit(2); }
  const rows = [], summary = []; let total = 0, fails = 0;
  for (const [W, H] of [[2560, 1440], [3840, 2160]]) {
    for (const reduce of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: reduce ? 'reduce' : 'no-preference' }), page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto(`http://localhost:${port}/?audit${process.env.ENTRY ? '&from=portfolio' : ''}`);  // ENTRY=1: the portfolio entry's fluid await page.waitForFunction(() => window.__intro && window.__intro.ready && window.__intro.seek, null, { timeout: 30000 });
      const frames = reduce ? [{ phase: 'reduced', i: 0, pd: 1, loopT: 0, bud: 0, out: 0 }] : timeline();
      for (const fr of frames) {
        await page.evaluate(st => window.__intro.seek(st), { pd: fr.pd, loopT: fr.loopT, bud: fr.bud, out: fr.out, noPoints: true, mask: true });  // points are separate 4 px circles, judged in the crops
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        // the Start key's own outline (a rounded rectangle under the HTML button) has straight sides by design: its corners are still judged
        const kb = await page.evaluate(() => { const r = document.getElementById('start').getBoundingClientRect(); return [r.left - 8, r.top - 8, r.right + 8, r.bottom + 8]; });
        const buf = await page.screenshot(), r = await analyze(buf, ISO, null, [kb]); total++;
        const tag = `${W}x${H} ${fr.phase} frame ${fr.i}`;
        if (r.fails.length) {
          fails++; const f0 = r.fails[0], [cx, cy] = f0.at, clip = { x: Math.max(0, Math.round(cx) - 40), y: Math.max(0, Math.round(cy) - 40), width: 80, height: 80 };
          const file = `fail-${W}-${fr.i}${reduce ? '-r' : ''}.png`; await crop400(page, path.join(out, file), clip);
          rows.push(`<tr class=bad><td>${tag}</td><td>${r.outlines.length}</td><td>${r.fails.map(x => `corner ${x.corner} rad, straight ${x.straight} px at ${x.at.map(Math.round)}`).join('<br>')}</td><td><img src="${file}"></td></tr>`);
        } else rows.push(`<tr><td>${tag}</td><td>${r.outlines.length}</td><td>pass</td><td></td></tr>`);
      }
      summary.push(`${W}x${H}${reduce ? ' reduced motion' : ''}: ${frames.length} frames${errs.length ? ', page errors: ' + errs.join('; ') : ''}`);
      await ctx.close();
    }
  }
  const ev = +(process.env.EVERY || 10), ph = process.env.PHASE;
  const line = `curve audit: ${total} frames (landing${ph ? ' ' + ph : ''}, ${ev === 1 ? 'every frame' : `every ${ev}th frame`} at 2560x1440 and 3840x2160, plus reduced motion), ${fails} failures`;
  fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset=utf-8><title>Curve audit</title><style>body{font:13px system-ui;background:#16131a;color:#eee;margin:20px}td{border:1px solid #333;padding:4px 8px;vertical-align:top}.bad{background:#3a1420}img{width:320px;image-rendering:pixelated}</style>
<h1>${line}</h1><p>${summary.join('<br>')}</p><table><tr><th>frame</th><th>outlines</th><th>result</th><th>400% crop of the first failure</th></tr>${rows.join('\n')}</table>`);
  console.log(summary.join('\n')); console.log(line);
  fs.appendFileSync(path.join(out, 'summary.log'), `${new Date().toISOString()}  ${line}\n`);  // every run's summary line, for the contact sheet
}

// ── 400% crops of the landing's edges: the blob's outline, a droplet or the bud, and the Start key's corner. Each crop is centred on
//    the outline itself, found by walking out from the blob's centre to where the image drops below the trace level ──
async function edgeFrom(buf, x, y, dx, dy, maxR) {
  const t = tool || (tool = await browser.newPage());
  return t.evaluate(async ([b64, x, y, dx, dy, maxR]) => {
    const i = new Image(); await new Promise(r => { i.onload = r; i.src = 'data:image/png;base64,' + b64; });
    const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, i.width, i.height).data;
    const v = (px, py) => { const o = (Math.round(py) * i.width + Math.round(px)) * 4; return (d[o] - d[o + 1]) / 255; };  // pinkness, so grey hairlines and text never count
    let last = null; for (let r = 0; r < maxR; r++) { const px = x + dx * r, py = y + dy * r; if (px < 1 || py < 1 || px > i.width - 2 || py > i.height - 2) break; if (v(px, py) > 0.3 && v(px + dx, py + dy) <= 0.3) last = [px, py]; }
    return last;
  }, [buf.toString('base64'), x, y, dx, dy, maxR]);
}
async function crops(phase) {
  if (!tool) { tool = await browser.newPage(); await tool.goto('about:blank'); }
  const dir = path.join(out, 'crops', phase); fs.mkdirSync(dir, { recursive: true });
  for (const [W, H] of [[2560, 1440], [3840, 2160]]) {
    const U = 0.2 * Math.min(H, W * 1.1), cx = W / 2, cy = H * 0.42, by = cy + U * 1.45 + 22;
    const box = (p, w = 96, h = 96) => p && ({ x: Math.round(p[0] - w / 2), y: Math.round(p[1] - h / 2), width: w, height: h });
    const shots = [
      ['loading', { pct: 45 }, [['droplet-edge', [cx, cy, -1, 0, 1.6 * U]], ['droplet-edge-2', [cx, cy, 0.7071, -0.7071, 1.6 * U]]]],
      ['bud', { bud: 1150 }, [['drop', null, { x: Math.round(cx - 100), y: Math.round(cy + 0.75 * U), width: 200, height: Math.round(by - cy - 0.75 * U + 34) }]]],
      ['ready', { ready: 1500 }, [['blob-edge-right', [cx, cy, 1, 0, 1.4 * U]], ['blob-edge-diag', [cx, cy, -0.7071, -0.7071, 1.4 * U]], ['start-corner', null, { x: Math.round(cx + 112 - 40), y: Math.round(by - 28 - 24), width: 64, height: 64 }]]],
      ['exit', { start: 220 }, [['drop-edge', [cx, cy, 1, 0, 1.4 * U]]]],
    ];
    for (const [name, how, regions] of shots) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H } }), page = await ctx.newPage();
      if (how.pct) { const s = await ctx.newCDPSession(page); await s.send('Network.setCacheDisabled', { cacheDisabled: true }); }
      await page.goto(`http://localhost:${port}/`, { waitUntil: how.pct ? 'commit' : 'load' });
      if (how.pct) await page.waitForFunction(p => +(document.getElementById('intro-count')?.getAttribute('aria-valuenow') || 0) >= p, how.pct, { timeout: 30000, polling: 'raf' });
      if (how.bud) { await page.waitForFunction(() => window.__intro && window.__intro.ready, null, { timeout: 30000, polling: 'raf' }); await page.waitForTimeout(how.bud); }
      if (how.ready || how.start) await page.waitForSelector('#start.in', { timeout: 30000 });
      if (how.ready) await page.waitForTimeout(how.ready);
      if (how.start) { await page.click('#start'); await page.waitForTimeout(how.start); }
      // freeze the moment: one screenshot to find the edges, crops taken from that same capture
      const full = await page.screenshot(), img = await tool.evaluate(async b64 => b64, full.toString('base64'));
      for (const [rn, ray, fixed] of regions) {
        const clip = fixed || box(await edgeFrom(full, ...ray));
        if (!clip) { console.log(`${W} ${name} ${rn}: no edge found`); continue; }
        const png = await tool.evaluate(async ([b64, c]) => { const i = new Image(); await new Promise(r => { i.onload = r; i.src = 'data:image/png;base64,' + b64; }); const o = document.createElement('canvas'); o.width = c.width * 4; o.height = c.height * 4; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(i, c.x, c.y, c.width, c.height, 0, 0, o.width, o.height); return o.toDataURL('image/png').split(',')[1]; }, [img, clip]);
        fs.writeFileSync(path.join(dir, `${W}-${name}-${rn}.png`), Buffer.from(png, 'base64'));
      }
      await ctx.close();
    }
  }
  console.log('crops saved in', dir);
}

// ── contact sheet: the 400% crops before and after at both sizes, and every audit run's summary line ──
function sheet() {
  const dir = path.join(out, 'crops'), names = new Set();
  for (const ph of ['before', 'after']) if (fs.existsSync(path.join(dir, ph))) for (const f of fs.readdirSync(path.join(dir, ph))) names.add(f);
  const cell = (ph, f) => fs.existsSync(path.join(dir, ph, f)) ? `<img src="crops/${ph}/${f}">` : '-';
  const rows = [...names].sort().map(f => `<tr><th>${f.replace('.png', '')}</th><td>${cell('before', f)}</td><td>${cell('after', f)}</td></tr>`).join('\n');
  const log = fs.existsSync(path.join(out, 'summary.log')) ? fs.readFileSync(path.join(out, 'summary.log'), 'utf8') : '';
  fs.writeFileSync(path.join(out, 'contact.html'), `<!doctype html><meta charset=utf-8><title>Curve audit: contact sheet</title><style>body{font:13px system-ui;background:#16131a;color:#eee;margin:20px}th,td{border:1px solid #333;padding:6px;vertical-align:top;text-align:left}img{width:384px;image-rendering:pixelated}pre{background:#0d0b10;padding:12px;white-space:pre-wrap}</style>
<h1>Landing: 400% crops, before and after</h1><p>Every pixel shown as a 4x4 block. Report of the last audit run: <a href="index.html">index.html</a>.</p><h2>Audit runs</h2><pre>${log}</pre><table><tr><th>crop</th><th>before</th><th>after</th></tr>${rows}</table>`);
  console.log('contact sheet:', path.join(out, 'contact.html'));
}

if (mode === 'selftest') await selftest();
else if (mode === 'sheet') sheet();
else if (mode === 'landing') await landing();
else if (mode === 'crops') await crops(process.argv[3] || 'after');
else console.error('usage: curve-audit.mjs selftest | landing | crops <before|after> | sheet [--port N]');
await browser.close();
