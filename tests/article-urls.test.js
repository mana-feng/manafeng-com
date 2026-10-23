'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

test('existing article filenames, date paths and published URLs remain available', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/article-urls.json'), 'utf8'));
  for (const [name, url] of Object.entries(expected)) {
    const raw = fs.readFileSync(path.join(root, 'source/_posts', name), 'utf8');
    const article = yaml.load(raw.split('---', 3)[1], { schema: yaml.JSON_SCHEMA });
    assert.equal('/' + article.date.slice(0, 10).replaceAll('-', '/') + '/' + name.slice(0, -3) + '/', url, name);
    const html = fs.readFileSync(path.join(root, 'public', url, 'index.html'), 'utf8');
    const published = html.match(/<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/);
    assert.ok(published, `missing published URL for ${name}`);
    assert.equal(new URL(published[1]).pathname.replace(/index\.html$/, ''), url);
  }
});

test('Pages builds use the site timezone so date-based article URLs stay stable', () => {
  const site = yaml.load(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'));
  const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8'));
  assert.equal(workflow.env.TZ, site.timezone);
});

test('previous UTC-built article bookmarks keep their query and section when redirected', () => {
  for (const [previous, current] of [
    ['/2023/02/24/liu-yao-ru-men/', '/2023/02/25/liu-yao-ru-men/'],
    ['/2023/02/05/metaphysics-basics/', '/2023/02/06/metaphysics-basics/']
  ]) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'public', previous, 'index.html'), 'utf8'));
    const doc = dom.window.document;
    assert.equal(new URL(doc.querySelector('link[rel="canonical"]').getAttribute('href')).pathname, current);
    assert.equal(doc.querySelector('a').getAttribute('href'), current);
    let destination;
    vm.runInNewContext(doc.querySelector('script').textContent, {
      location: { search: '?from=bookmark', hash: '#heading-3', replace: url => { destination = url; } }
    });
    assert.equal(destination, current + '?from=bookmark#heading-3');
    dom.window.close();
  }
});
