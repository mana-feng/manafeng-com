'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const url = 'http://127.0.0.1:4320/';
const projectId = root => crypto.createHash('sha256').update(fs.realpathSync(root)).digest('hex');

function probe(root, port = 4320) {
  return new Promise((resolve, reject) => {
    const occupied = () => new Error(`端口 ${port} 已被其他项目或程序占用，请先关闭该程序后重试。`);
    const request = http.get(`http://127.0.0.1:${port}/api/health`, { agent:false }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; if (text.length > 4096) request.destroy(occupied()); });
      response.on('end', () => {
        try {
          const health = JSON.parse(text);
          if (response.statusCode !== 200 || health.app !== 'manafeng-local-admin' || health.project !== projectId(root)) return reject(occupied());
          resolve(true);
        } catch { reject(occupied()); }
      });
      response.on('error', reject);
    });
    request.setTimeout(1500, () => request.destroy(occupied()));
    request.on('error', error => error.code === 'ECONNREFUSED' ? resolve(false) : reject(error));
  });
}

async function launch(root) {
  if (!await probe(root)) {
    if (!fs.existsSync(path.join(root, 'node_modules/hexo/bin/hexo'))) throw new Error('项目依赖尚未安装，请先完成本地环境安装。');
    const logDir = path.join(root, '.local-admin');
    fs.mkdirSync(logDir, { recursive:true });
    const log = fs.openSync(path.join(logDir, 'startup.log'), 'a');
    let failure;
    try {
      const child = spawn(process.execPath, [path.join(__dirname, 'start.cjs')], { cwd:root, detached:true, windowsHide:true, stdio:['ignore',log,log] });
      child.once('error', error => { failure = error; });
      child.unref();
    } finally { fs.closeSync(log); }
    const deadline = Date.now() + 30000;
    while (!await probe(root)) {
      if (failure) throw failure;
      if (Date.now() >= deadline) throw new Error('本地后台未能启动，请查看 .local-admin/startup.log。');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  await new Promise((resolve, reject) => {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide:true, stdio:'ignore' });
    browser.once('error', reject);
    browser.once('spawn', () => { browser.unref(); resolve(); });
  });
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  launch(root).catch(error => {
    const logDir = path.join(root, '.local-admin');
    try { fs.mkdirSync(logDir, { recursive:true }); fs.appendFileSync(path.join(logDir, 'startup.log'), `\n[${new Date().toISOString()}] ${error.message}\n`); } catch { /* The caller also reports a failed start. */ }
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { probe };
