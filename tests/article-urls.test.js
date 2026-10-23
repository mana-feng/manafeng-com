'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');
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
