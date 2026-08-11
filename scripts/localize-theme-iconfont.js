/*
 * Fluid 主题在 layout/_partials/css.ejs 中硬编码了自身依赖的图标库 CDN 地址，
 * 无法通过配置覆盖，这里在渲染产物中替换为 source/lib/ 下的自托管副本。
 * 主题升级后如果图标库 id 变化，需要重新下载并更新此处的文件名。
 */
const REMOTE = /(?:https?:)?\/\/at\.alicdn\.com\/t\/c\/font_1749284_5i9bdhy70f8\.css/g;
const LOCAL = '/lib/iconfont-theme/iconfont.css';

hexo.extend.filter.register('after_render:html', function (str) {
  return str.replace(REMOTE, LOCAL);
}, 5);
