'use strict';

const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');

test('the mobile menu hides its closed links and restores reading access after Escape', async () => {
  const dom = new JSDOM(`<header><button id="navbar-toggler-btn">菜单</button>
    <div id="mobile-grid-menu"><a href="/">首页</a><a href="/categories/">分类</a></div></header>
    <main><p>Article</p></main><a id="scroll-top-button" href="#">顶部</a>`, { runScripts: 'outside-only' });
  const script = path.resolve(__dirname, '../source/js/site-ui.js');
  Object.defineProperty(dom.window, 'innerWidth', { value: 390, configurable: true });
  if (existsSync(script)) dom.window.eval(readFileSync(script, 'utf8'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const menu = dom.window.document.querySelector('#mobile-grid-menu');
  const main = dom.window.document.querySelector('main');
  assert.equal(dom.window.document.querySelector('#navbar-toggler-btn').getAttribute('aria-controls'), menu.id);
  assert.equal(menu.hasAttribute('inert'), true, 'closed navigation must not remain keyboard-focusable');
  menu.classList.add('show');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(main.hasAttribute('inert'), true, 'the full-screen menu must isolate background content');
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(menu.classList.contains('show'), false);
  assert.equal(main.hasAttribute('inert'), false);
  assert.equal(dom.window.document.activeElement.id, 'navbar-toggler-btn');
  dom.window.close();
});
