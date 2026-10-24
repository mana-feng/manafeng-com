# ManaFeng 博客

基于 Hexo 和 Fluid 的静态博客源码，发布地址：<https://manafeng.com/>。

## 本地预览与构建

需要 Node.js 20.19 或更新版本，GitHub Pages 使用 Node.js 24。

```sh
npm ci
npm run server
```

生成静态网站：

```sh
npm run clean
npm run build
```

生成结果位于 `public/`，不提交到源码分支。推送到 `main` 后，GitHub Actions 自动构建并发布到 GitHub Pages。

## 源码目录

| 位置 | 用途 |
| --- | --- |
| `source/_posts/` | 文章及分类、标签等元数据 |
| `source/images/` | 文章图片 |
| `source/css/`、`source/js/` | 网站样式和交互 |
| `source/lib/` | 网站使用的前端库 |
| `layout/` | 分类导航与手机目录模板 |
| `scripts/` | 网站构建钩子：导航、旧链接跳转、图标本地化和访问统计 |
| `_config.yml`、`_config.fluid.yml` | Hexo 和 Fluid 配置 |
| `package.json`、`package-lock.json` | 构建依赖及锁定版本 |
| `.github/workflows/deploy.yml` | GitHub Pages 构建发布流程 |

`main` 只维护网站源码和必要的构建发布文件。本地管理工具、启动脚本、测试、开发笔记及临时数据不在该分支跟踪。
