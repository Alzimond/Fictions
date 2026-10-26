/* Optional local preview: node tools/serve.cjs. No dependencies. Ctrl+C stops it. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
    fs.readFile(file, (error, bytes) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(error ? 'Not found' : bytes);
    });
  } catch { response.writeHead(400); response.end('Invalid request'); }
}).listen(4173, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:4173'));
