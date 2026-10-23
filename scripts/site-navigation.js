/* Keep site-specific views outside node_modules so theme upgrades are repeatable. */
'use strict';

const { escapeHTML } = require('hexo-util');

hexo.extend.filter.register('theme_inject', function (injects) {
  injects.header.file('site-categories', 'layout/site-categories.ejs', {}, { cache: false }, 100);
  injects.postMarkdownBegin.file('mobile-toc', 'layout/mobile-toc.ejs', {}, { cache: false });
});

// Preserve old category/tag bookmarks after consolidating the taxonomy.
hexo.extend.generator.register('legacy-navigation', function () {
  const aliases = [
    ['categories/接触式磁卡入门/', 'categories/技术教程/'],
    ['tags/玄学入门/', 'categories/玄学入门/']
  ];
  const root = hexo.config.root || '/';
  return aliases.map(([from, to]) => {
    const target = root + to.split('/').map(encodeURIComponent).join('/') + '#board';
    const canonical = new URL(target.split('#')[0], hexo.config.url).href;
    return {
      path: from + 'index.html',
      data: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>分类已整理 - ManaFeng</title><link rel="canonical" href="${escapeHTML(canonical)}">
<meta http-equiv="refresh" content="0;url=${escapeHTML(target)}"></head>
<body><p>分类已整理，<a href="${escapeHTML(target)}">继续浏览文章</a>。</p></body></html>`
    };
  });
});
