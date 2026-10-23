'use strict';

const assert = require('node:assert/strict');
const { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const Hexo = require('hexo');
const { JSDOM } = require('jsdom');

test('real pagination retains categories absent from the current page', async t => {
  const root = path.resolve(__dirname, '..');
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'manafeng-pagination-test-'));
  const modules = path.join(fixture, 'node_modules');
  const hexo = new Hexo(fixture, { silent: true });
  t.after(async () => {
    await hexo.exit();
    // Remove the dependency junction before deleting the isolated temporary project.
    assert.equal(path.dirname(path.resolve(fixture)), path.resolve(os.tmpdir()));
    unlinkSync(modules);
    rmSync(fixture, { recursive: true, force: true });
  });
  symlinkSync(path.join(root, 'node_modules'), modules, process.platform === 'win32' ? 'junction' : 'dir');
  for (const file of ['package.json', '_config.yml', '_config.fluid.yml', 'layout']) {
    cpSync(path.join(root, file), path.join(fixture, file), { recursive: true });
  }
  mkdirSync(path.join(fixture, 'scripts'));
  cpSync(path.join(root, 'scripts/site-navigation.js'), path.join(fixture, 'scripts/site-navigation.js'));
  mkdirSync(path.join(fixture, 'source/_posts'), { recursive: true });
  for (let index = 1; index <= 12; index++) {
    const category = index <= 2 ? '技术教程' : '玄学入门';
    writeFileSync(path.join(fixture, 'source/_posts', `sample-${index}.md`),
      `---\ntitle: Sample ${index}\ndate: 2026-01-${String(index).padStart(2, '0')}\ncategories:\n  - ${category}\n---\n\nFixture article.\n`);
  }
  await hexo.init();
  await hexo.call('generate');

  for (const [file, cards] of [['index.html', 10], ['page/2/index.html', 2]]) {
    const dom = new JSDOM(readFileSync(path.join(fixture, 'public', file), 'utf8'));
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.index-header').length, cards);
    if (cards === 10) assert.doesNotMatch(doc.querySelector('#board').textContent, /技术教程/);
    const nav = doc.querySelector('.site-category-nav');
    assert.ok(nav, `missing navigation on ${file}`);
    for (const [category, count] of [['', 12], ['玄学入门', 10], ['技术教程', 2]]) {
      const link = [...nav.querySelectorAll('a')].find(item => item.dataset.category === category);
      assert.equal(Number(link?.dataset.count), count, `${category || 'all posts'} total on ${file}`);
      const destination = decodeURIComponent(link.getAttribute('href').split('#')[0]).replace(/^\//, '');
      assert.ok(readFileSync(path.join(fixture, 'public', destination, 'index.html')).length);
    }
    dom.window.close();
  }
});
