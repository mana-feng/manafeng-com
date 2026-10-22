'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = () => {
  assert.ok(fs.existsSync(path.join(root, '.pages.yml')), 'Pages CMS must have a repository configuration');
  return yaml.load(read('.pages.yml'));
};
const posts = () => fs.readdirSync(path.join(root, 'source/_posts')).filter(name => name.endsWith('.md'));
const metadata = name => yaml.load(read(`source/_posts/${name}`).split('---', 3)[1], { schema: yaml.JSON_SCHEMA });

test('CMS fields accept every existing article without discarding metadata or HTML', () => {
  const cms = config();
  const collection = cms.content.find(item => item.path === 'source/_posts');
  assert.ok(collection, 'the editor must use the existing article directory');
  assert.equal(cms.settings.content.merge, true, 'unmanaged metadata must survive a save');
  assert.notEqual(collection.fields.find(field => field.name === 'body').type, 'rich-text', 'HTML must not go through a rich-text converter');
  for (const name of posts()) {
    const article = metadata(name);
    for (const field of collection.fields.filter(field => field.list)) {
      assert.ok(Array.isArray(article[field.name] ?? []), `${name}: ${field.name} must be an array; Pages CMS discards scalar list values`);
      const values = article[field.name] ?? [];
      if (field.list.max) assert.ok(values.length <= field.list.max, `${name}: too many ${field.name}`);
    }
  }
});

test('existing article filenames, date paths and published URLs remain available', () => {
  const expected = JSON.parse(read('tests/fixtures/article-urls.json'));
  for (const [name, url] of Object.entries(expected)) {
    const article = metadata(name);
    assert.equal('/' + article.date.slice(0, 10).replaceAll('-', '/') + '/' + name.slice(0, -3) + '/', url, name);
    const html = read(`public${url}index.html`);
    const publishedUrl = html.match(/<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/);
    assert.ok(publishedUrl, `missing published URL for ${name}`);
    assert.equal(new URL(publishedUrl[1]).pathname.replace(/index\.html$/, ''), url);
  }
  const collection = config().content.find(item => item.path === 'source/_posts');
  assert.equal(collection.operations.rename, false, 'renaming would change Hexo article paths');
  assert.equal(collection.fields.find(field => field.name === 'date').readonly, true, 'publishing dates are part of article URLs');
});

test('CMS image URLs resolve to the existing image files without renaming them', () => {
  const cms = config();
  const sources = Array.isArray(cms.media) ? cms.media : [cms.media];
  for (const name of posts()) {
    const images = [...read(`source/_posts/${name}`).matchAll(/(?:src|href)=["'](\/images\/[^"']+)["']/g)];
    for (const [, url] of images) {
      const media = sources.find(item => url.startsWith(item.output + '/'));
      assert.ok(media, `no media source covers ${url}`);
      assert.equal(media.rename, false, 'uploads must keep the selected filename');
      const relative = decodeURIComponent(url.slice(media.output.length + 1));
      assert.ok(fs.existsSync(path.join(root, media.input, relative)), `${name}: ${url}`);
    }
  }
});
