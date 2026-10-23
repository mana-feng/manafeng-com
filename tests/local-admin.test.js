'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const { createAdminServer } = require('../tools/local-admin/server.cjs');

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manafeng-admin-test-'));
  fs.mkdirSync(path.join(root, 'source/_posts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'source/images'), { recursive: true });
  fs.writeFileSync(path.join(root, '_config.yml'), 'url: https://example.test\ntimezone: Asia/Shanghai\n');
  const original = '---\r\ntitle: Original\r\ndate: 2023-01-19 17:57:23\r\ncategories: [技术教程]\r\ntags: [硬件, 测试]\r\ncustom: keep\r\n---\r\n\r\n<h1 id="fixed">Original HTML</h1>\r\n<table><tr><td>Cell</td></tr></table>\r\n';
  fs.writeFileSync(path.join(root, 'source/_posts/original.md'), original);
  const server = createAdminServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const state = await (await fetch(origin + '/api/state')).json();
  const request = (route, data, headers = {}) => fetch(origin + route, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Local-Token': state.token, ...headers }, body: JSON.stringify(data)
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, original, origin, state, request, post: state.posts[0], file: path.join(root, 'source/_posts/original.md') };
}

test('metadata edits preserve body bytes, link fields and unknown metadata; no-op saves do not rewrite files', async t => {
  const f = await fixture(t);
  const noop = await f.request('/api/posts/save', { id: f.post.id, revision: f.post.revision, title: f.post.title, category: f.post.category, tags: f.post.tags, index_img: '' });
  assert.equal(noop.status, 200);
  assert.equal((await noop.json()).changed, false);
  assert.equal(fs.readFileSync(f.file, 'utf8'), f.original);
  const result = await f.request('/api/posts/save', { id: f.post.id, revision: f.post.revision, title: 'Changed', category: '技术教程', tags: ['硬件'], index_img: '' });
  assert.equal(result.status, 200);
  const updated = await result.json();
  const raw = fs.readFileSync(f.file, 'utf8');
  assert.equal(raw.split('---')[2], f.original.split('---')[2]);
  assert.match(raw, /date: ['"]?2023-01-19 17:57:23/);
  assert.match(raw, /custom: keep/);
  assert.equal(updated.post.url, f.post.url);
  assert.ok(fs.readdirSync(path.join(f.root, '.local-admin/backups')).length);
  assert.equal((await f.request('/api/posts/save', { id: f.post.id, revision: f.post.revision, title: 'Stale' })).status, 409);
});

test('date, permalink and source changes are rejected and article creation stays inside the post directory', async t => {
  const f = await fixture(t);
  for (const change of [{ date: '2030-01-01' }, { permalink: '/new/' }, { source: '../outside.md' }]) {
    assert.equal((await f.request('/api/posts/save', { id: f.post.id, revision: f.post.revision, ...change })).status, 400);
  }
  assert.equal(fs.readFileSync(f.file, 'utf8'), f.original);
  assert.equal((await f.request('/api/posts/create', { slug: '../outside', title: 'Bad', category: '技术教程', tags: [] })).status, 400);
  const created = await f.request('/api/posts/create', { slug: 'new-article', title: 'New', category: '技术教程', tags: ['新标签'], body: '# New\n' });
  assert.equal(created.status, 201);
  assert.ok(fs.existsSync(path.join(f.root, 'source/_posts/new-article.md')));
  assert.equal((await f.request('/api/posts/create', { slug: 'new-article', title: 'New', category: '技术教程' })).status, 409);
});

test('taxonomy rename and merge preserve article bodies and deduplicate tags', async t => {
  const f = await fixture(t);
  const result = await f.request('/api/taxonomy/rename', { kind: 'tags', from: '测试', to: '硬件' });
  assert.equal(result.status, 200);
  const state = await (await fetch(f.origin + '/api/state')).json();
  assert.deepEqual(state.posts[0].tags, ['硬件']);
  assert.equal(fs.readFileSync(f.file, 'utf8').split('---')[2], f.original.split('---')[2]);
  assert.equal(state.posts[0].url, f.post.url);
});

test('only same-origin requests with the current token can write; there are no deployment endpoints', async t => {
  const f = await fixture(t);
  const data = { kind: 'tags', name: 'New' };
  assert.equal((await f.request('/api/taxonomy/add', data, { Origin: 'https://unrelated.test' })).status, 403);
  assert.equal((await f.request('/api/taxonomy/add', data, { 'X-Local-Token': 'wrong' })).status, 403);
  const wrongHost = await new Promise(resolve => http.get(f.origin + '/api/state', { headers: { Host: 'unrelated.test' } }, response => { response.resume(); resolve(response.statusCode); }));
  assert.equal(wrongHost, 403);
  assert.equal((await f.request('/api/deploy', {})).status, 404);
  assert.equal((await f.request('/api/publish', {})).status, 404);
  assert.equal((await f.request('/api/taxonomy/add', data)).status, 200);
});

test('image uploads reject path traversal, invalid bytes and overwrites; referenced images cannot be deleted', async t => {
  const f = await fixture(t);
  const content = Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64');
  assert.equal((await f.request('/api/media/upload', { name: '../bad.png', content })).status, 400);
  assert.equal((await f.request('/api/media/upload', { name: 'bad.png', content: Buffer.from('<script>').toString('base64') })).status, 400);
  assert.equal((await f.request('/api/media/upload', { name: 'good.png', content })).status, 201);
  assert.equal((await f.request('/api/media/upload', { name: 'good.png', content })).status, 409);
  fs.writeFileSync(f.file, f.original.replace('custom: keep', 'custom: keep\r\nbanner_img: /images/good.png'));
  assert.equal((await f.request('/api/media/delete', { name: 'good.png' })).status, 409, 'frontmatter-only image references must be protected');
  fs.writeFileSync(f.file, f.original);
  fs.appendFileSync(f.file, '<img src="/images/good.png">');
  assert.equal((await f.request('/api/media/delete', { name: 'good.png' })).status, 409);
  fs.writeFileSync(f.file, f.original);
  assert.equal((await f.request('/api/media/delete', { name: 'good.png' })).status, 200);
  assert.equal(fs.existsSync(path.join(f.root, 'source/images/good.png')), false);
});

test('saving freezes the form and navigation until the response completes', async t => {
  const f = await fixture(t);
  const ui = path.join(__dirname, '../tools/local-admin/public');
  const dom = new JSDOM(fs.readFileSync(path.join(ui, 'index.html'), 'utf8'), { url:f.origin, runScripts:'outside-only' });
  t.after(() => dom.window.close());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  dom.window.fetch = async (url, options = {}) => {
    const response = await fetch(new URL(url, f.origin), { ...options, headers:{ ...options.headers, ...(options.method === 'POST' ? { Origin:f.origin } : {}) } });
    if (url === '/api/posts/save') await gate;
    return response;
  };
  dom.window.eval(fs.readFileSync(path.join(ui, 'app.js'), 'utf8'));
  async function wait(predicate) { for (let attempt=0; attempt<200 && !predicate(); attempt++) await new Promise(resolve => setTimeout(resolve, 10)); assert.ok(predicate()); }
  await wait(() => dom.window.document.querySelector('.article-title'));
  dom.window.document.querySelector('.article-title').click();
  const title = dom.window.document.querySelector('#post-title');
  title.value = 'Updated title';
  title.dispatchEvent(new dom.window.Event('input', { bubbles:true }));
  dom.window.document.querySelector('#post-form').dispatchEvent(new dom.window.Event('submit', { bubbles:true, cancelable:true }));
  const bodyFrozen = dom.window.document.querySelector('#post-body').disabled;
  const navigationFrozen = dom.window.document.querySelector('[data-page="tags"]').disabled;
  release();
  await wait(() => dom.window.document.querySelector('#message').textContent.includes('已保存到本机'));
  assert.equal(bodyFrozen, true, 'typing during an in-flight save must not be discarded');
  assert.equal(navigationFrozen, true, 'navigation must not discard the in-flight editor');
  assert.equal(dom.window.document.querySelector('#post-body').disabled, false);
});
