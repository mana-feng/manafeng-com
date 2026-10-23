'use strict';

const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const frontMatter = require('hexo-front-matter');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const load = file => new JSDOM(readFileSync(path.join(output, file), 'utf8'));
const posts = readdirSync(path.join(root, 'source/_posts')).filter(name => name.endsWith('.md'));

test('article footers retain author and date without a license section', () => {
  for (const name of posts) {
    const raw = readFileSync(path.join(root, 'source/_posts', name), 'utf8');
    const date = raw.match(/^date:\s*['"]?(\d{4})-(\d{2})-(\d{2})/m).slice(1).join('/');
    const dom = load(`${date}/${name.slice(0,-3)}/index.html`);
    const doc = dom.window.document;
    const boxes = doc.querySelectorAll('.license-box');
    assert.equal(boxes.length, 1);
    const box = boxes[0];
    assert.equal(box.querySelector('.license-meta-item').textContent.replace(/\s+/g,' ').trim(), '作者 ManaFeng');
    assert.ok(box.querySelector('.license-meta-date'));
    assert.equal(box.querySelectorAll('a[href*="creativecommons.org"]').length, 0);
    assert.doesNotMatch(box.textContent, /许可协议/);
    dom.window.close();
  }
});

test('category navigation uses full-site totals even on a page showing a subset of articles', () => {
  const expected = new Map();
  for (const name of posts) {
    const post = frontMatter.parse(readFileSync(path.join(root, 'source/_posts', name), 'utf8').replace(/\r\n/g, '\n'));
    const category = Array.isArray(post.categories) ? post.categories[0] : post.categories;
    if (category) expected.set(category, (expected.get(category) || 0) + 1);
  }
  for (const file of ['index.html', 'archives/2023/index.html']) {
    const dom = load(file);
    const nav = dom.window.document.querySelector('nav.site-category-nav');
    assert.ok(nav, `missing full-site navigation on ${file}`);
    assert.equal(Number(nav.querySelector('[data-category=""]').dataset.count), posts.length);
    for (const [name, count] of expected) {
      const link = [...nav.querySelectorAll('a[data-category]')].find(a => a.dataset.category === name);
      assert.ok(link, `${name} must remain reachable on ${file}`);
      assert.equal(Number(link.dataset.count), count);
      assert.ok(link.getAttribute('href').endsWith('#board'));
    }
    dom.window.close();
  }
});

test('articles with headings expose a native collapsible mobile table of contents', () => {
  const dom = load('2023/01/19/sle4442-password-crack/index.html');
  const doc = dom.window.document;
  const toc = doc.querySelector('details.mobile-toc');
  assert.ok(toc?.querySelector('summary'), 'mobile readers need a keyboard-accessible TOC');
  assert.ok(toc.querySelectorAll('a[href^="#"]').length >= 2);
  for (const link of toc.querySelectorAll('a[href^="#"]')) {
    const fragment = link.getAttribute('href').slice(1);
    assert.ok(doc.getElementById(fragment) || doc.getElementById(decodeURIComponent(fragment)), `broken TOC target ${fragment}`);
  }
  dom.window.close();
});

function htmlFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}

test('generated pages have no broken local resource or page links', () => {
  const failures = [];
  for (const file of htmlFiles(output)) {
    const dom = new JSDOM(readFileSync(file, 'utf8'));
    for (const el of dom.window.document.querySelectorAll('[href],[src],[data-src]')) {
      for (const attribute of ['href', 'src', 'data-src']) {
        const value = el.getAttribute(attribute);
        if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) continue;
        const target = decodeURIComponent(value.split(/[?#]/)[0]);
        const local = target.startsWith('/') ? path.join(output, target) : path.resolve(path.dirname(file), target);
        if (!existsSync(local) && !existsSync(path.join(local, 'index.html'))) failures.push(`${path.relative(output, file)}: ${value}`);
      }
    }
    dom.window.close();
  }
  assert.deepEqual(failures, []);
});

test('theme upgrades cannot silently restore an external stylesheet dependency', () => {
  const dom = load('index.html');
  const external = [...dom.window.document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => link.getAttribute('href')).filter(href => /^(?:https?:)?\/\//.test(href));
  assert.deepEqual(external, [], 'local icon/font/library styles must remain self-hosted');
  dom.window.close();
});

test('old category and generic tag bookmarks still reach an existing category', () => {
  for (const [from, target] of [
    ['categories/接触式磁卡入门/index.html', '/categories/技术教程/'],
    ['tags/玄学入门/index.html', '/categories/玄学入门/']
  ]) {
    const dom = load(from);
    const link = dom.window.document.querySelector('a');
    assert.equal(decodeURIComponent(link.getAttribute('href')), target + '#board');
    assert.ok(dom.window.document.querySelector('meta[http-equiv="refresh"]'));
    dom.window.close();
  }
});
