'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { test } = require('node:test');
const { createAdminServer } = require('../tools/local-admin/server.cjs');

test('the launcher recognizes this project, rejects a foreign service and detects a stopped backend', async t => {
  const entry = path.join(__dirname, '../tools/local-admin/launch.cjs');
  assert.ok(fs.existsSync(entry), 'The one-click launcher is missing');
  const { probe } = require(entry);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manafeng-launch-test-'));
  fs.mkdirSync(path.join(root, 'source/_posts'), { recursive:true });
  fs.mkdirSync(path.join(root, 'source/images'), { recursive:true });
  const server = createAdminServer({ root });
  t.after(async () => {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive:true, force:true });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  assert.equal(await probe(root, port), true);
  await assert.rejects(probe(__dirname, port), /其他项目|占用/);
  await new Promise(resolve => server.close(resolve));
  assert.equal(await probe(root, port), false);
  const foreign = http.createServer((req, res) => res.end('<html>Other app</html>'));
  t.after(async () => { if (foreign.listening) await new Promise(resolve => foreign.close(resolve)); });
  await new Promise(resolve => foreign.listen(port, '127.0.0.1', resolve));
  await assert.rejects(probe(root, port), /其他项目|占用/);
});
