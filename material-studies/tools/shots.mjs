// Round shots on the real GPU, and the before/after contact sheet.
//
//   node material-studies/tools/shots.mjs <round> <before|after> <spec.json> [--port 3000]
//
// Needs the lab served (npx serve material-studies) and playwright-core with its Chromium installed
// (npm i playwright-core && npx playwright-core install chromium). If playwright-core isn't installed
// next to this file, point PW at its index.mjs: PW=file:///C:/path/node_modules/playwright-core/index.mjs
//
// spec.json: { "shots": [ { "name": "bao-close", "study": "squish", "toy": "bao", "preset": "closest",
//   "act": "poke" | "squeeze" | "hover:<css>" | "press:<css>" | "tap:fx,fy[,ms]" | "hold:fx,fy,ms" | "drag:fx,fy,tx,ty,ms" | "up:" (3D view at viewport fractions;
//   a hold stays pressed through the shot), "pre": [ acts run first, e.g. a tap to crack ], "at": 1500, "clip": "<css selector>",
//   "look": [x, y, z, theta, phi, r] (aim at a point: object close-ups),
//   "dpr": 2, "ref": "refs/....jpg", "note": "what to look at",
//   "landing": "loading" | "bud" | "ready" | "transition" (the landing before the lab: "loading" shoots a cold-cache load once the counter
//   reaches "pct"; "bud" shoots "at" ms after the landing turns ready; "ready" waits for Start and then "at" ms; "transition" presses Start, by mouse or with "key": true by keyboard, and
//   shoots "at" ms later), "reducedMotion": true } ], "fpsMs": 10000 }
// Every other shot presses Start on the landing first, so the lab shots go through it too.
// Every shot opens the lab at 2560x1440 on Ultra, waits for the scene to settle, sets the camera preset, runs the action
// at `at` ms, saves material-studies/shots/<round>/<phase>/<name>.png, and finally measures fps over fpsMs on the last
// shot's scene. The WebGL renderer string is printed; SwiftShader / llvmpipe / Basic Render means the shots are invalid.
// The contact sheet material-studies/shots/<round>/index.html shows reference | before | after per shot name, plus the
// pass log from material-studies/shots/<round>/log.md if it exists.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), ms = path.resolve(here, '..');
const [round, phase, specPath] = process.argv.slice(2);
if (!round || !['before', 'after'].includes(phase) || !specPath) { console.error('usage: shots.mjs <round> <before|after> <spec.json> [--port N]'); process.exit(1); }
const port = process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '3000';
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const { chromium } = await import(process.env.PW || 'playwright-core');
const out = path.join(ms, 'shots', round, phase); fs.mkdirSync(out, { recursive: true });
// camera presets as orbit [theta, phi, radius as a multiple of the study's home radius]
const PRESETS = { home: null, closest: [0.5, 1.08, 0], 'three-quarter': [0.75, 1.0, 0.8], plinth: [0.5, 1.42, 0.7], top: [0.5, 0.3, 0.9] };
const browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--window-position=-3000,0'] });
const errors = []; let page;
async function openShot(s) {
  if (page) await page.context().close();
  const ctx = await browser.newContext({ viewport: { width: 2560 / (s.dpr || 1), height: 1440 / (s.dpr || 1) }, deviceScaleFactor: s.dpr || 1, reducedMotion: s.reducedMotion ? 'reduce' : 'no-preference' });
  page = await ctx.newPage();
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/X4\d{3}|Program Info Log/.test(m.text())) errors.push(`${s.name}: ${m.text().slice(0, 240)}`); });
  page.on('pageerror', e => errors.push(`${s.name}: ${e.message}`));
  if (s.landing === 'loading') { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); }
  await page.goto(`http://localhost:${port}/?debug#${s.study || 'squish'}`, { waitUntil: s.landing === 'loading' ? 'commit' : 'load' });
  if (s.landing) return landing(s);
  await page.waitForFunction(() => window.__ms && window.__ms.cur, null, { timeout: 30000 });
  if (await page.$('#intro')) { await page.waitForSelector('#start.in', { timeout: 30000 }); await page.click('#start'); await page.waitForSelector('#intro', { state: 'detached', timeout: 10000 }); }
  await page.evaluate(() => { const b = document.querySelector('[data-q="ultra"], #q-ultra'); if (b) b.click(); });
  if (s.toy) { await page.click(`#${s.study || 'squish'}-toy-${s.toy}`); }
  await page.waitForTimeout(s.settle ?? 3500);
  const pr = PRESETS[s.preset || 'home'];
  if (pr) await page.evaluate(pr => { const o = __ms.orbit, h = o.home; o.goal.th = o.cur.th = pr[0]; o.goal.ph = o.cur.ph = pr[1]; o.goal.r = o.cur.r = pr[2] ? h.r * pr[2] : o.minR; }, pr);
  // "look": [x, y, z, theta, phi, r] - aim at a point in the scene from that angle and distance (close-ups of single objects)
  if (s.look) await page.evaluate(l => { const o = __ms.orbit; o.target.set(l[0], l[1], l[2]); o.goal.th = o.cur.th = l[3]; o.goal.ph = o.cur.ph = l[4]; o.minR = Math.min(o.minR, l[5]); o.goal.r = o.cur.r = l[5]; }, s.look);
  await page.waitForTimeout(600);
}
async function landing(s) {
  if (s.landing === 'loading') { await page.waitForFunction(p => +(document.getElementById('intro-count')?.getAttribute('aria-valuenow') || 0) >= p, s.pct ?? 40, { timeout: 30000, polling: 'raf' }); return; }
  if (s.landing === 'bud') { await page.waitForFunction(() => window.__intro && window.__intro.ready, null, { timeout: 30000, polling: 'raf' }); await page.waitForTimeout(s.at ?? 900); return; }
  await page.waitForSelector('#start.in', { timeout: 30000 });
  if (s.landing === 'transition') { if (s.key) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement && document.activeElement.id) !== 'start') throw new Error('Tab did not reach Start'); await page.keyboard.press('Enter'); } else await page.click('#start'); }
  await page.waitForTimeout(s.at ?? 1000);
}
async function act(s) {
  if (s.landing) return;
  for (const a of s.pre || []) await act({ act: a, after: 700 });
  if (!s.act) return;
  if (s.at) await page.waitForTimeout(s.at);
  const [kind, sel] = s.act.split(/:(.*)/s);
  // tap / hold on the 3D view at viewport fractions "fx,fy[,ms]": a tap presses and releases; a hold stays down through the shot
  if (kind === 'tap' || kind === 'hold') { const [fx, fy, ms = 120] = sel.split(',').map(Number), vp = page.viewportSize(); await page.mouse.move(vp.width * fx, vp.height * fy); await page.mouse.down(); await page.waitForTimeout(ms); if (kind === 'tap') await page.mouse.up(); }
  // drag:fx,fy,tx,ty,ms - press at (fx,fy), move to (tx,ty) over ms and stay pressed through the shot (a pull)
  else if (kind === 'drag') { const [fx, fy, tx, ty, ms = 800] = sel.split(',').map(Number), vp = page.viewportSize(), n = Math.max(1, Math.round(ms / 25)); await page.mouse.move(vp.width * fx, vp.height * fy); await page.mouse.down(); for (let i = 1; i <= n; i++) { await page.mouse.move(vp.width * (fx + (tx - fx) * i / n), vp.height * (fy + (ty - fy) * i / n)); await page.waitForTimeout(25); } }
  else if (kind === 'up') await page.mouse.up();  // up: let go of a hold or drag from "pre"
  else if (kind === 'hover') await page.hover(sel);
  else if (kind === 'press') { await page.hover(sel); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); }
  else if (kind === 'focus') await page.focus(sel);
  else await page.evaluate(k => __ms.cur.actions[k] && __ms.cur.actions[k](), kind === 'squeeze' ? 'poke' : kind);
  await page.waitForTimeout(s.after ?? 400);
}
let gl = null;
for (const s of spec.shots) {
  await openShot(s);
  if (!gl && await page.evaluate(() => !!window.__ms)) { gl = await page.evaluate(() => { const r = __ms.renderer.getContext(), d = r.getExtension('WEBGL_debug_renderer_info'); return d ? r.getParameter(d.UNMASKED_RENDERER_WEBGL) : r.getParameter(r.RENDERER); }); console.log('WebGL renderer:', gl); if (/SwiftShader|llvmpipe|Basic Render/i.test(gl)) { console.error('software renderer: shots are invalid'); process.exit(2); } }
  await act(s);
  const file = path.join(out, s.name + '.png');
  if (s.clip) await page.locator(s.clip).first().screenshot({ path: file }); else await page.screenshot({ path: file });
  if (s.act && /^(hold|drag):/.test(s.act)) await page.mouse.up();
  console.log('saved', path.relative(ms, file));
}
const fps = await page.evaluate(ms => new Promise(r => { let k = 0; const t0 = performance.now(), times = []; let last = t0; const f = t => { times.push(t - last); last = t; k++; if (t - t0 >= ms) { times.sort((a, b) => a - b); r({ fps: +(k * 1000 / (t - t0)).toFixed(1), p95ms: +times[Math.floor(times.length * 0.95)].toFixed(2) }); } else requestAnimationFrame(f); }; requestAnimationFrame(f); }), spec.fpsMs || 10000);
console.log(`fps over ${(spec.fpsMs || 10000) / 1000}s on the last shot: ${fps.fps} (95th percentile frame ${fps.p95ms} ms)`);
console.log(errors.length ? `console errors/warnings:\n  ${errors.join('\n  ')}` : 'console: no errors or warnings');
fs.writeFileSync(path.join(out, '_run.json'), JSON.stringify({ gl, fps, errors, at: new Date().toISOString() }, null, 2));
await browser.close();
// contact sheet: every shot name seen in either phase
const sheet = path.join(ms, 'shots', round), names = new Map();
for (const ph of ['before', 'after']) { const d = path.join(sheet, ph); if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.png')) names.set(f, names.get(f) || {}); }
for (const s of spec.shots) names.set(s.name + '.png', s);
const run = ph => { try { return JSON.parse(fs.readFileSync(path.join(sheet, ph, '_run.json'), 'utf8')); } catch { return null; } };
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const log = fs.existsSync(path.join(sheet, 'log.md')) ? fs.readFileSync(path.join(sheet, 'log.md'), 'utf8') : '';
const cell = (ph, f) => fs.existsSync(path.join(sheet, ph, f)) ? `<a href="${ph}/${f}"><img src="${ph}/${f}" loading="lazy"></a>` : '<span>-</span>';
const rows = [...names].sort().map(([f, s]) => `<tr><th>${esc(f.replace('.png', ''))}${s.note ? `<small>${esc(s.note)}</small>` : ''}</th><td>${s.ref ? `<a href="../../${s.ref}"><img src="../../${s.ref}"></a>` : '<span>-</span>'}</td><td>${cell('before', f)}</td><td>${cell('after', f)}</td></tr>`).join('\n');
const meta = ph => { const r = run(ph); return r ? `${ph}: ${esc(r.gl)} · ${r.fps.fps} fps (p95 ${r.fps.p95ms} ms) · ${r.errors.length} console errors/warnings` : `${ph}: not run`; };
fs.writeFileSync(path.join(sheet, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Round ${esc(round)} shots</title>
<style>body{font:14px system-ui;background:#16131a;color:#eee;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;vertical-align:top}th{width:12%;text-align:left}small{display:block;color:#aaa;font-weight:400;margin-top:4px}img{width:100%;display:block}pre{white-space:pre-wrap;background:#0d0b10;padding:12px;border-radius:8px}</style>
<h1>Round ${esc(round)}</h1><p>${meta('before')}<br>${meta('after')}</p>
<table><tr><th>shot</th><th>reference</th><th>before</th><th>after</th></tr>${rows}</table>
${log ? `<h2>Pass log</h2><pre>${esc(log)}</pre>` : ''}`);
console.log('contact sheet:', path.join(sheet, 'index.html'));
