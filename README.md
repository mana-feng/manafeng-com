# ManaFeng 博客

基于 Hexo 和 Fluid 的静态博客，GitHub Actions 负责构建并发布到 GitHub Pages。

浏览器中管理本地文章、分类、标签和图片，运行 `npm run admin`，然后打开 <http://127.0.0.1:4320/>。详见 [本地后台使用说明](docs/local-admin.md)。

Windows 可以直接双击 `启动本地后台.vbs`（或桌面的「ManaFeng 本地后台」快捷方式），自动启动后台并打开浏览器。

## 本地使用

需要 Node.js 20.19 或更新版本；发布环境使用 Node.js 24。

```sh
npm ci
npm run server
```

提交前运行完整检查：

```sh
npm run check
```

这会清除旧产物、重新生成网站，并验证搜索交互、手机菜单、分类统计、目录和站内链接。`npm test` 单独运行测试时，需要已有的 `public/` 构建结果。不要手工编辑 `public/` 或 `node_modules/`。

## 目录和职责

| 位置 | 用途 |
| --- | --- |
| `source/_posts/` | 文章和头部元数据 |
| `source/css/` | 项目自己的界面样式 |
| `source/js/local-search.js` | 覆盖主题同名搜索资源，提供普通文字匹配、缓存和失败反馈 |
| `source/js/site-ui.js` | 手机目录、回顶和菜单键盘交互 |
| `layout/` | 通过 Fluid 注入接口加载的分类导航、手机目录模板 |
| `scripts/` | 构建注入、图标本地化及旧分类链接兼容 |
| `source/lib/` | 当前启用的主题前端库的本地副本 |
| `tests/` | 行为测试和生成页面检查 |
| `.github/workflows/deploy.yml` | 安装锁定依赖、检查并发布 |

## 分类与标签

分类使用三个大类：技术教程、玄学入门、杂记。读卡器、小六壬、六爻、澳洲等具体主题使用标签。新文章在 Front-matter 中填写一个分类和适当的主题标签；正文不需要为导航添加额外标记。

分类链接在构建时直接从全站分类数据生成，数量不会受当前分页影响，刷新和分享链接也能保留当前分类。旧的 `categories/接触式磁卡入门/` 和 `tags/玄学入门/` 地址保留为跳转页。

## 上游与本地覆盖

2026-10-22 核对的最新稳定版为 [Fluid 1.9.9](https://github.com/fluid-dev/hexo-theme-fluid/releases/tag/v1.9.9) 和 [Hexo 8.1.2](https://github.com/hexojs/hexo/releases/tag/v8.1.2)，与锁定依赖一致。Fluid 主分支另有尚未发布的 [TOC 截断修复](https://github.com/fluid-dev/hexo-theme-fluid/commit/48031f9ebc78e18cbf1be02921938438144fef2c)。本项目通过自己的 CSS 修复目录截断和换行，继续使用已发布主题版本。

升级依赖时先检查官方变更，再更新并提交 `package-lock.json`，运行完整检查，并在浏览器验证桌面、平板和手机。重点确认：主题仍采用本项目的同名搜索资源；分类及目录注入接口仍可用；图标替换规则仍匹配。生成页面检查会拒绝意外恢复的外部样式表依赖。

手机检查应覆盖菜单开关、Esc、搜索关闭后的焦点、目录跳转、返回顶部；桌面检查应覆盖首屏内容、分类跳转、目录和暗色模式。
