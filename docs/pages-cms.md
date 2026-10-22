# 用 Pages CMS 管理博客

Pages CMS 的配置是仓库根目录的 `.pages.yml`。它直接编辑 GitHub 上的源文件，Hexo、Fluid 和现有 GitHub Pages 发布流程继续负责生成网站，不需要迁移文章或图片。

## 首次连接

1. 将本次接入配置及分类格式兼容修改提交到 `mana-feng/manafeng-com` 的 `main` 分支。
2. 打开 <https://app.pagescms.org/>，使用 GitHub 登录。
3. 按页面提示安装 Pages CMS 的 GitHub App，选择 **Only select repositories**，仅选择 `manafeng-com`。
4. 打开 `mana-feng/manafeng-com`，选择 `main` 分支。左侧应出现「文章」和「图片」。
5. 先打开一篇文章，确认标题、分类、标签和正文原文正常显示。只查看时不用点击保存。

Pages CMS 读取的是所选分支上的文件，不会读取本机尚未提交的修改。开始在线编辑前，应先同步本地改动，避免两个位置同时修改同一篇文章。

## 文章

- 文章列表显示标题、日期、分类和标签，支持搜索与排序。
- 新建文章时，填写标题，并在文件名输入框使用一个稳定的英文短名，例如 `my-new-post.md`。文件名决定文章地址中的最后一段。
- 新文章的发布日期自动填入创建时的日期。现有文章日期只读；修改标题不会改动文件名。
- 文章重命名和删除默认关闭，以保护已有文章地址。
- 正文使用原文编辑器，支持现有 HTML 与 Markdown。它不会经过富文本编辑器转换。分类或标签的调整无需触碰正文。
- 「列表封面」可以从图片库中选择，也可以保持空白。

## 分类和标签

分类和标签直接保存在每篇文章的头部信息中，没有第二套分类数据库。

- 分类填写一个名称，优先使用「技术教程」「玄学入门」「杂记」，也可以填写新的名称。
- 标签每项填写一个名称，可以逐项增加或移除。
- 同名分类或标签会由 Hexo 自动归到一起；保存并构建后，导航和数量自动更新。
- 若要把一个分类或标签整体改名，需要修改使用它的每篇文章。Pages CMS 本次接入不提供批量改名功能；旧分类或标签的地址若需要继续可用，还需添加跳转规则。

## 图片

「图片」对应 `source/images/`，公开引用路径仍是 `/images/文件名`。上传不会自动改名，已有图片没有移动或重命名。

插入正文时，可以使用 Markdown `![说明](/images/example.png)`，也可以保留原有 HTML 图片写法。已被文章使用的图片应保留原来的文件名和位置；删除或改名不会自动修改正文中的引用。

## 保存和发布

在 `main` 分支保存文章或图片会创建 GitHub 提交，触发现有的 GitHub Actions 发布。保存后可在仓库的 Actions 页面查看构建结果，成功后再查看 <https://manafeng.com/>。

Pages CMS 保留未在表单中列出的元数据，例如已有 `permalink`、`updated` 和 `excerpt`。它在保存时会重新输出头部 YAML，并可能整理换行；正文使用原文模式以保留 HTML、表格和锚点结构。

官方日期控件按分钟往返，今后保存旧文章时，时间中的秒数可能归零；这不会改变本项目按日生成的文章地址。本次接入没有改动文章时间。

项目的 `npm run check` 包含 CMS 字段兼容、原有文章地址和图片引用检查。链接基线记录在 `tests/fixtures/article-urls.json`；有意迁移旧文章地址时，先安排跳转，再更新基线。

接入时仅将《出行！》的 `categories: 杂记` 改为单项列表，以免 Pages CMS 把旧的单值分类当成空列表。分类名称、正文、日期、文件名和文章地址不变。

## 官方文档

- [首次连接](https://pagescms.org/docs/quick-start/)
- [字段及原文编辑](https://pagescms.org/docs/configuration/content/fields/)
- [保留未配置的元数据](https://pagescms.org/docs/configuration/settings/)
- [图片目录映射](https://pagescms.org/docs/configuration/media/)
