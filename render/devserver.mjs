// 本機預覽用的小伺服器（不需安裝任何套件）：
//   node render/devserver.mjs [port]
// 提供 film/ 的靜態檔案；POST /save/<檔名> 會把內容寫到 out/stills/，方便存下單格畫面檢查。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM = path.join(ROOT, 'film');
const OUT = path.join(ROOT, 'out', 'stills');
const port = parseInt(process.argv[2] || '8765', 10);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname.startsWith('/save/')) {
    const name = path.basename(url.pathname).replace(/[^\w.\-]/g, '_');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, name), Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); });
    return;
  }
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  const file = path.join(FILM, p);
  if (!file.startsWith(FILM) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`preview: http://localhost:${port}/`));
