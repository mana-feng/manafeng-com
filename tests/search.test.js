'use strict';

const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const localScript = path.join(root, 'source/js/local-search.js');
const script = readFileSync(existsSync(localScript) ? localScript :
  path.join(root, 'node_modules/hexo-theme-fluid/source/js/local-search.js'), 'utf8');
const jquery = readFileSync(path.join(root, 'source/lib/jquery/jquery.min.js'), 'utf8');
const xml = String.raw`<?xml version="1.0"?><search><entry>
  <title>Literal guide</title><url>/literal/</url>
  <content><![CDATA[<p>alpha (x) [notes] C++ a.b path\file</p>]]></content>
</entry><entry><title>Other guide</title><url>/other/</url>
  <content><![CDATA[<p>alpha beta</p>]]></content>
</entry></search>`;

async function waitFor(predicate) {
  const end = Date.now() + 2000;
  while (!predicate() && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function fixture(t, unavailable = false) {
  let requests = 0;
  const server = http.createServer((req, res) => {
    requests++;
    res.writeHead(unavailable ? 503 : 200, { 'Content-Type': 'application/xml' });
    res.end(unavailable ? 'unavailable' : xml);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const dom = new JSDOM(`<button id="navbar-toggler-btn">菜单</button>
    <div id="mobile-grid-menu"><a id="mobile-search-trigger" href="#">搜索</a></div>
    <div id="modalSearch"><div class="modal-body">
    <label for="local-search-input">关键词</label><input id="local-search-input">
    <div id="local-search-result" class="list-group"></div></div></div>`, {
    url: origin, runScripts: 'outside-only'
  });
  const errors = [];
  dom.window.addEventListener('error', event => {
    errors.push(event.error);
    event.preventDefault();
  });
  dom.window.CONFIG = { search_path: '/search.xml', include_content_in_search: true };
  // jsdom supplies XMLHttpRequest; adapt its missing fetch to the real local server.
  dom.window.fetch = (url, options) => fetch(new URL(url, origin), options);
  dom.window.eval(jquery);
  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  t.after(async () => {
    dom.window.close();
    await new Promise(resolve => server.close(resolve));
  });
  const input = dom.window.document.querySelector('input');
  const result = dom.window.document.querySelector('#local-search-result');
  const enter = value => {
    input.value = value;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const open = source => dom.window.jQuery('#modalSearch').trigger(
    dom.window.jQuery.Event('show.bs.modal', { relatedTarget: source }));
  const close = () => dom.window.jQuery('#modalSearch').trigger('hidden.bs.modal');
  open();
  if (!unavailable) {
    await waitFor(() => { enter('alpha'); return result.querySelectorAll('a').length === 2; });
    assert.equal(result.querySelectorAll('a').length, 2, 'index should load before testing queries');
  }
  return { dom, errors, enter, open, close, result, requests: () => requests };
}

test('search treats punctuation as literal text instead of executable regular expressions', async t => {
  const f = await fixture(t);
  for (const query of ['(', '[', 'C++', 'a.b', '\\']) {
    f.enter(query);
    assert.equal(f.errors.length, 0, `query ${query} must not throw`);
    assert.equal(f.result.querySelectorAll('a').length, 1, `query ${query} should find its article`);
    assert.equal(f.result.querySelector('a').getAttribute('href'), '/literal/');
    assert.ok(f.result.querySelector('.search-word'), 'literal match should be highlighted');
  }
});

test('search retains case-insensitive AND matching and clears stale results', async t => {
  const f = await fixture(t);
  f.enter('ALPHA beta');
  assert.equal(f.result.querySelector('a').getAttribute('href'), '/other/');
  f.enter('no such article');
  assert.equal(f.result.querySelectorAll('a').length, 0);
  f.enter('');
  assert.equal(f.result.querySelectorAll('a').length, 0);
});

test('reopening search reuses the loaded index', async t => {
  const f = await fixture(t);
  f.close();
  f.open();
  await new Promise(resolve => setTimeout(resolve, 80));
  f.enter('beta');
  assert.equal(f.result.querySelector('a').getAttribute('href'), '/other/');
  assert.equal(f.requests(), 1, 'reopening must not download or bind the index again');
});

test('a failed search index request gives accessible feedback instead of an endless spinner', async t => {
  const f = await fixture(t, true);
  await waitFor(() => f.dom.window.document.querySelector('[role="status"]')?.textContent.match(/不可用|失败|重试/));
  assert.match(f.dom.window.document.querySelector('[role="status"]')?.textContent || '', /不可用|失败|重试/);
  assert.equal(f.result.querySelector('.spinner-border'), null);
});

test('closing search opened from the mobile menu returns focus to its visible toggle', async t => {
  const f = await fixture(t);
  f.close();
  const trigger = f.dom.window.document.querySelector('#mobile-search-trigger');
  trigger.focus();
  f.open(trigger);
  f.dom.window.document.querySelector('input').focus();
  // Bootstrap registers its own return-focus callback after the show handler.
  f.dom.window.jQuery('#modalSearch').on('hidden.bs.modal.bootstrapFixture', () => trigger.focus());
  f.close();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.dom.window.document.activeElement.id, 'navbar-toggler-btn');
});
