'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore, AdminError } = require('./store.cjs');

function createAdminServer({ root }) {
  const store = createStore(root);
  const project = crypto.createHash('sha256').update(fs.realpathSync(root)).digest('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const staticFiles = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const host = `127.0.0.1:${server.address().port}`;
      const origin = `http://${host}`;
      if (req.headers.host !== host || !['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw new AdminError(403, '后台只允许本机访问');
      if (req.headers.origin && req.headers.origin !== origin) throw new AdminError(403, '请求来源无效');
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new AdminError(403, '不允许其他网站访问本地后台');
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && staticFiles[url.pathname]) {
        const [name, type] = staticFiles[url.pathname];
        res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(__dirname, 'public', name)));
      }
      if (req.method === 'GET' && url.pathname === '/api/state') return send(200, { ...store.state(), token });
      if (req.method === 'GET' && url.pathname === '/api/health') return send(200, { app:'manafeng-local-admin', project, pid:process.pid });
      if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
        const image = store.image(decodeURIComponent(url.pathname.slice(7)));
        res.writeHead(200, { 'Content-Type': image.mime }); return res.end(image.bytes);
      }
      const routes = {
        '/api/posts/save': [200, input => store.save(input)],
        '/api/posts/create': [201, input => store.create(input)],
        '/api/taxonomy/add': [200, input => store.addTerm(input)],
        '/api/taxonomy/rename': [200, input => store.renameTerm(input)],
        '/api/media/upload': [201, input => store.upload(input)],
        '/api/media/delete': [200, input => store.deleteImage(input)]
      };
      if (req.method !== 'POST' || !routes[url.pathname]) return send(404, { error: '没有这个操作' });
      if (req.headers.origin !== origin || req.headers['x-local-token'] !== token || req.headers['content-type']?.split(';')[0] !== 'application/json') throw new AdminError(403, '请从本机后台页面执行此操作');
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 12 * 1024 * 1024) throw new AdminError(413, '请求过大'); chunks.push(chunk); }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AdminError(400, '请求内容无效'); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AdminError(400, '请求内容无效');
      const [status, action] = routes[url.pathname];
      send(status, action(input));
    } catch (error) {
      if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : '本地文件操作失败，请检查文件是否被其他程序占用' });
      else res.end();
    }
  });
  return server;
}

module.exports = { createAdminServer };
