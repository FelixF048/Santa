// 逐格渲染：用無頭 Chromium 開啟 film/index.html，對每一格呼叫 window.render(t)，把畫面送進 ffmpeg。
//
//   node render/render.mjs                         整部片 → out/santa_silent.mp4
//   node render/render.mjs --workers 4 --fps 24    平行分段渲染後接起來
//   node render/render.mjs --from 228 --to 252     只渲染一段（秒）
//   node render/render.mjs --stills 13,56,238,281  只輸出單格 JPEG 到 out/stills/
//
//   node render/render.mjs --ss 1                  內部超取樣倍數（預設 2；沒有 GPU 時用 1 比較快）
//
// 需要：Node 18+、ffmpeg、`npm install`、`npx playwright install chromium`。
// 畫面是 WebGL2（厚塗引擎）。環境變數 SANTA_GL 決定無頭瀏覽器用什麼繪圖：
//   egl / vulkan = 顯示卡（Colab 的 T4）；swiftshader = 純 CPU 的軟體繪圖（預設，很慢）；native = 交給瀏覽器自己決定（本機有顯示卡時）。
// 有 NVIDIA GPU 時編碼會自動改用 h264_nvenc。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM = path.join(ROOT, 'film');
const OUT = path.join(ROOT, 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = parseFloat(arg('fps', '24'));
const WORKERS = Math.max(1, parseInt(arg('workers', String(Math.min(4, Math.max(1, os.cpus().length - 1)))), 10));
const [VW, VH] = arg('size', '1920x1080').split('x').map(Number);
const QUALITY = parseFloat(arg('jpeg', '0.92'));
const OUTFILE = path.resolve(arg('out', path.join(OUT, 'santa_silent.mp4')));
const STILLS = arg('stills', null);
const SS = arg('ss', '2');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
      const f = path.join(FILM, p);
      if (!f.startsWith(FILM) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}
function pickEncoder() {
  const test = enc => spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x144:d=0.2', '-c:v', enc, '-f', 'null', '-'], { stdio: 'ignore' }).status === 0;
  if (process.env.SANTA_ENCODER !== 'cpu' && test('h264_nvenc')) return { name: 'h264_nvenc (GPU)', args: ['-c:v', 'h264_nvenc', '-preset', 'p6', '-rc', 'vbr', '-cq', '19', '-b:v', '0'] };
  return { name: 'libx264 (CPU)', args: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17'] };
}
async function openPage(browser, base) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
  await page.goto(base + '/index.html?bare&ss=' + SS);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  return page;
}
const grab = (page, t) => page.evaluate(([t, q]) => { window.render(t); return document.getElementById('cv').toDataURL('image/jpeg', q); }, [t, QUALITY])
  .then(u => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const GLMODE = process.env.SANTA_GL || (process.env.SANTA_GPU === '1' ? 'egl' : 'swiftshader');
const glArgs = ({
  egl: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu'],
  vulkan: ['--use-gl=angle', '--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'],
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  native: ['--ignore-gpu-blocklist', '--enable-gpu'],
})[GLMODE] || [];
const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none', ...glArgs] });
fs.mkdirSync(OUT, { recursive: true });

try {
  const page0 = await openPage(browser, base);
  const DUR = await page0.evaluate('window.DUR');
  console.log(`renderer: ${await page0.evaluate('window.GLINFO')}  (SANTA_GL=${GLMODE}, ss=${SS})`);
  fs.writeFileSync(path.join(OUT, 'captions.json'), JSON.stringify(await page0.evaluate('window.CAPS'), null, 1));
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(await page0.evaluate('window.SHOTS_INFO()'), null, 1));

  if (STILLS) {
    fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
    for (const s of STILLS.split(',')) {
      const t = parseFloat(s), f = path.join(OUT, 'stills', `t_${String(t).replace('.', '_')}.jpg`);
      fs.writeFileSync(f, await grab(page0, t)); console.log('still', f);
    }
  } else {
    const f0 = Math.round(parseFloat(arg('from', '0')) * FPS), f1 = Math.round(Math.min(DUR, parseFloat(arg('to', String(DUR)))) * FPS);
    const total = f1 - f0, n = Math.min(WORKERS, total), enc = pickEncoder(), t00 = Date.now();
    console.log(`frames ${f0}..${f1} (${total}) @ ${FPS} fps, ${n} worker(s), encoder ${enc.name}`);
    await page0.close();
    let done = 0, lastLog = 0;
    const parts = await Promise.all(Array.from({ length: n }, async (_, w) => {
      const a = f0 + Math.floor(total * w / n), b = f0 + Math.floor(total * (w + 1) / n);
      const part = path.join(OUT, `part_${String(w).padStart(2, '0')}.mp4`);
      const ff = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        ...enc.args, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', part], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
      const page = await openPage(browser, base);
      for (let f = a; f < b; f++) {
        const buf = await grab(page, f / FPS);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        done++;
        if (Date.now() - lastLog > 15000) { lastLog = Date.now(); const el = (Date.now() - t00) / 1000; console.log(`  ${done}/${total} frames  ${(done / el).toFixed(1)} fps  ETA ${Math.round((total - done) / (done / el))} s`); }
      }
      ff.stdin.end(); await closed; await page.close();
      return part;
    }));
    const list = path.join(OUT, 'parts.txt');
    fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUTFILE], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('concat failed');
    for (const p of parts) fs.unlinkSync(p); fs.unlinkSync(list);
    console.log(`done: ${OUTFILE}  (${((Date.now() - t00) / 1000).toFixed(0)} s)`);
  }
} finally {
  await browser.close(); srv.close();
}
