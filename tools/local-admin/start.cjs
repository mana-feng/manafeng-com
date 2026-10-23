'use strict';

const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createAdminServer } = require('./server.cjs');

const root = path.resolve(__dirname, '../..');
const server = createAdminServer({ root });
let preview;
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? '本地后台端口 4320 已在使用，请打开 http://127.0.0.1:4320/' : error.message); process.exitCode=1; });
server.listen(4320, '127.0.0.1', () => {
  console.log('本地管理：http://127.0.0.1:4320/');
  console.log('只保存到本机；不执行 Git、上传或发布。按 Ctrl+C 停止。');
  const request = http.get('http://127.0.0.1:4317/', response => { response.resume(); console.log('网站预览：http://127.0.0.1:4317/'); });
  request.setTimeout(1500, () => request.destroy());
  request.on('error', () => {
    preview = spawn(process.execPath, [path.join(root,'node_modules/hexo/bin/hexo'),'server','--port','4317','--ip','127.0.0.1'], { cwd:root, env:{ ...process.env, LOCAL_CONTENT_ADMIN:'1' }, windowsHide:true, stdio:'inherit' });
    preview.on('error', error => console.error('网站预览启动失败：' + error.message));
  });
});
function stop() { if (preview) preview.kill(); server.close(() => process.exit(0)); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
