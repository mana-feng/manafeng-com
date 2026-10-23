---
title: 内网穿透服务器搭建入门
date: 2023-08-03 13:50:52
categories:
  - 技术教程
tags:
  - 内网穿透
  - 建站
  - Linux
---

早期这个博客曾运行在配置不高的云主机上。后来，我尝试把服务放到家里的 Orange Pi 上，再通过 NATAPP 提供公网访问入口。这里把当时的搭建记录重新整理成一份按顺序操作的教程。

本文的软件配置按 2026 年 10 月的官方文档整理，以 Ubuntu 上的单站点部署为例。实际安装前，仍需确认自己的系统版本、设备架构和服务商提供的隧道功能。

**阅读方式：先选一条路线，再沿着这一条做完。** 文中的命令在 Orange Pi 的 Linux 终端执行；GitHub Pages 部分的构建命令在自己的电脑上执行。域名、账号和令牌都需要替换成自己的值。

## 先选适合自己的建站路线

| 你想做什么 | 选择的路线 | 需要维护什么 |
| --- | --- | --- |
| 运行 Halo，使用动态程序和数据库 | [路线 A：Orange Pi 自建](#heading-1) | 设备、系统、容器、数据库和隧道 |
| 展示博客文章、文档和项目页面 | [路线 B：GitHub Pages](#heading-11) | 静态网站源码和构建流程 |

路线 A 的访问顺序是：**浏览器 → NATAPP 公网入口 → Orange Pi 上的 Nginx → Halo**。数据库只供 Halo 使用，不单独提供公网访问。

路线 B 的访问顺序是：**本地生成 HTML → 发布到 GitHub Pages → 浏览器访问**。它不需要 Orange Pi、NATAPP 或 Nginx，也不能直接运行 Halo 这类服务端程序。[GitHub Pages 发布方式说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

<h2 id="heading-1">路线 A 准备 Orange Pi</h2>

准备一块有稳定电源和网络连接的 Orange Pi、合适的散热、系统存储，以及一台用于配置的电脑。SD 卡或 SSD 的选择，要看具体板型支持什么；设备价格和配件也应按购买时的信息确认。

软件上先准备三样东西：适合板型的 Linux 镜像、可用的 SSH 连接，以及与系统架构匹配的安装包和容器镜像。下面以 Ubuntu 系统的操作方式说明。

<h3 id="heading-2">1 刷写系统并确认架构</h3>

1. 从 [Orange Pi 官方网站](https://www.orangepi.org/)找到具体板型的系统镜像和刷写说明。
2. 按说明把镜像写入 SD 卡或其他启动介质。写入会覆盖所选设备，先确认盘符和需要保留的数据。
3. 启动设备并接入路由器，从路由器后台或本机终端确认它的局域网 IP。
4. 使用系统镜像说明中的账号登录，修改初始密码，再通过 SSH 管理设备。

在设备上查看系统和架构：

```bash
cat /etc/os-release
uname -m
dpkg --print-architecture
```

例如，`aarch64` 通常对应 64 位 ARM，Ubuntu 包架构常显示为 `arm64`。**系统、Docker 和应用镜像都要匹配架构；使用 Compose 不会把 x86 镜像变成 ARM 镜像。** Docker 官方列出了 Ubuntu 支持的系统版本与架构，安装前先对照确认。[Docker Ubuntu 安装要求](https://docs.docker.com/engine/install/ubuntu/)

换软件源是可选项。先确认系统版本、架构和原配置；新版本 Ubuntu 可能使用 `/etc/apt/sources.list.d/ubuntu.sources`，不要不分版本地覆盖 `/etc/apt/sources.list`。需要换源时，可查看 [清华 Ubuntu Ports 镜像说明](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu-ports/)，并保留原配置备份。

<h2 id="heading-3">安装 Docker 并部署 Halo</h2>

先按 [Docker 官方 Ubuntu 安装文档](https://docs.docker.com/engine/install/ubuntu/)安装 Docker Engine 和 Compose 插件。已有容器或数据库的设备，应先检查现有安装和备份，再处理冲突包。

安装完成后验证：

```bash
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

能显示 Docker 和 Compose 版本，且测试容器正常结束后，再继续。下面统一使用 `docker compose`，不混用旧式的 `docker-compose` 命令。

<h3 id="heading-4">2 创建 Halo 和数据库配置</h3>

下面使用 Halo 社区版和 PostgreSQL。镜像标签以整理时官方文档中的 Halo 2.27 系列为示例；安装或升级前，应确认所选标签和系统架构。Halo 官方提供了不同数据库的部署模板，长期使用可从 PostgreSQL 方案开始。[Halo Compose 部署文档](https://docs.halo.run/guide/install/docker-compose)

创建目录：

```bash
mkdir -p ~/halo
cd ~/halo
openssl rand -hex 24
nano .env
```

在 `.env` 中写入以下两项。先生成一段自己的随机密码，填到第一项等号后；外部地址暂用本机地址，取得固定公网地址后再更新。

```dotenv
HALO_DB_PASSWORD=
HALO_EXTERNAL_URL=http://127.0.0.1:8090
```

然后创建 `compose.yaml`：

```yaml
services:
  halo:
    image: halohub/halo:2.27
    restart: unless-stopped
    ports:
      - '127.0.0.1:8090:8090'
    volumes:
      - ./halo2:/root/.halo2
    depends_on:
      halodb:
        condition: service_healthy
    environment:
      JVM_OPTS: '-Xmx256m -Xms256m'
    command:
      - --spring.r2dbc.url=r2dbc:pool:postgresql://halodb/halo
      - --spring.r2dbc.username=halo
      - --spring.r2dbc.password=${HALO_DB_PASSWORD:?请先在.env中设置数据库密码}
      - --spring.sql.init.platform=postgresql
      - --halo.external-url=${HALO_EXTERNAL_URL:?请设置外部访问地址}

  halodb:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - ./db:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: halo
      POSTGRES_DB: halo
      POSTGRES_PASSWORD: ${HALO_DB_PASSWORD:?请先在.env中设置数据库密码}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U halo -d halo']
      interval: 10s
      timeout: 5s
      retries: 5
```

这个配置把 Halo 的 `8090` 端口绑定到设备本机，由后面的 Nginx 接入；PostgreSQL 只在容器网络内使用。`halo2/` 和 `db/` 是持久化数据目录，需要一起纳入备份。

保存后执行：

```bash
chmod 600 .env
sudo docker compose config --quiet
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=80 halo
curl -I http://127.0.0.1:8090/
```

先确认本机请求能够得到 Halo 的响应。**此时其他电脑不能直接访问设备的 `8090` 端口，这是上面端口绑定方式的预期结果。** 初始化管理员账号之前，先把后面的代理和最终访问地址确定下来。

<h2 id="heading-6">配置公网访问</h2>

接下来按三层检查：先让 Nginx 在设备上访问 Halo，再让 NATAPP 连通 Nginx，最后处理公网域名和 HTTPS。这样出问题时，可以判断故障发生在哪一层。

<h3 id="heading-7">3 配置 Nginx 反向代理</h3>

安装 Nginx：

```bash
sudo apt-get update
sudo apt-get install nginx -y
```

下面适用于刚安装 Nginx、只运行这一个站点的设备。先备份默认配置，再编辑：

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
sudo nano /etc/nginx/sites-available/default
```

将这个文件替换为以下内容。已有多个站点时，应为 Halo 单独建立配置，设置对应的 `server_name`，避免覆盖其他站点。

```nginx
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这里先使用 HTTP 验证链路；启用外部 HTTPS 时，转发协议信息还需要按第 5 步调整。上传限制 `20m` 也可以根据自己的附件大小修改。

检查语法并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1/
```

本机 `80` 端口能得到 Halo 响应后，再进入下一步。若仍显示 Nginx 欢迎页，应先检查实际生效的站点配置。

<h3 id="heading-8">4 配置 NATAPP 隧道与开机自启</h3>

在 [NATAPP 控制台](https://natapp.cn/)创建或选择网站隧道，把目标主机设为 `127.0.0.1`，目标端口设为 `80`。固定域名、自定义域名和 HTTPS 能力，以所选隧道支持的功能为准。[NATAPP 新手教程](https://natapp.cn/article/natapp_newbie)

从官网下载与设备架构匹配的 Linux 客户端。解压得到 `natapp` 后，先用普通用户在其所在目录测试：

```bash
chmod +x natapp
nano config.ini
```

配置文件内容：

```ini
[default]
authtoken=替换为这条隧道的令牌
log=stdout
loglevel=INFO
```

```bash
chmod 600 config.ini
./natapp -config=config.ini
```

配置文件中的令牌与具体隧道对应，命令行参数可以覆盖同名配置。[NATAPP 配置文件说明](https://natapp.cn/article/config_ini)

用另一台设备或手机网络访问控制台给出的外网地址，确认请求能到达 Halo。不要把带令牌的配置、日志或截图上传到公开仓库。

测试成功后，可以交给 systemd 管理。先在另一终端取得客户端目录的绝对路径和当前用户名：

```bash
pwd
whoami
```

创建 `/etc/systemd/system/natapp.service`，把下面的 `YOUR_USER` 和 `/ABSOLUTE/PATH/natapp-client` 替换为实际值：

```ini
[Unit]
Description=NATAPP tunnel
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/ABSOLUTE/PATH/natapp-client
ExecStart=/ABSOLUTE/PATH/natapp-client/natapp -config=/ABSOLUTE/PATH/natapp-client/config.ini
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

先在之前的终端按 `Ctrl+C` 停止手动运行的客户端，再启用服务，避免同一个令牌重复登录：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now natapp
sudo systemctl status natapp --no-pager
sudo journalctl -u natapp -n 50 --no-pager
```

<h3 id="heading-9">5 确定 HTTPS 和证书放在哪里</h3>

这一步先确认 TLS 在哪里结束。下面两种配置方式对应不同的隧道能力，不能混着套用。

| HTTPS 方式 | 证书位置 | 本地 Nginx 接收什么 |
| --- | --- | --- |
| NATAPP 入口处理 HTTPS | NATAPP 提供或上传到隧道配置 | 通常仍为 HTTP，本例使用 80 端口 |
| HTTPS 直通到设备 | 本地 Nginx | HTTPS，需本地证书及相应隧道支持 |

**沿用本文主线时，选择在 NATAPP 入口处理 HTTPS。** NATAPP 二级域名与自有域名的证书配置方式不同；自有域名可按所用服务配置证书或自动续期。官方说明中特别区分了“域名 HTTPS”和“本地 HTTPS”，本地证书直通还需要相应开通条件。[NATAPP HTTPS 说明](https://natapp.cn/article/https)

确认最终入口使用 HTTPS 后，在本文这个专用站点的 Nginx 配置中，将：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

改为：

```nginx
proxy_set_header X-Forwarded-Proto https;
```

这是因为 HTTPS 在外部入口处理，Nginx 收到的回源请求仍可能是 HTTP。此写法以该站点的正式入口使用 HTTPS 为前提；如果同时提供多种协议，需要先确认代理传递的外部协议信息。不要直接在这个 HTTP 回源端口上添加无条件的 HTTPS 跳转，以免形成重定向循环。

再把 `~/halo/.env` 中的外部地址改为自己的最终地址，例如：

```dotenv
HALO_EXTERNAL_URL=https://blog.example.com
```

应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
cd ~/halo
sudo docker compose up -d
```

然后从最终域名访问 `/console`，完成初始化。绑定自有域名时，DNS 应按隧道控制台给出的记录配置，相关接入条件也应以服务商要求为准。[NATAPP 自有域名说明](https://natapp.cn/article/beian)

如果选择本地证书直通，应另外配置 Nginx 的 `443 ssl`、证书路径和相应隧道。普通网站 HTTP 隧道并不因为本地新增一个 443 监听，就自动变成端到端 HTTPS。

<h2 id="heading-10">6 按访问顺序排查问题</h2>

| 现象 | 先检查哪里 |
| --- | --- |
| 拉取镜像提示 `no matching manifest` | 系统架构与所选镜像标签是否匹配 |
| 本机 `8090` 无响应 | `docker compose ps`、Halo 日志、数据库状态与密码 |
| `8090` 正常，Nginx 返回 502 | Nginx 的 `proxy_pass` 和 Halo 实际监听地址 |
| 本机 `80` 正常，外网打不开 | NATAPP 在线状态、令牌和目标端口 |
| 外网能打开，图片或跳转地址错误 | `HALO_EXTERNAL_URL` 与转发协议设置 |
| 自定义域名异常 | DNS 记录、隧道绑定和证书对应域名 |

维护时同时保管 `.env`、`compose.yaml`、Halo 数据和数据库备份。升级先参考 [Halo 备份与恢复文档](https://docs.halo.run/guide/user-guide/backup)，不要只复制正在写入的数据库文件，也不要把删除数据目录当成排错步骤。

<h2 id="heading-11">路线 B 使用 GitHub Pages 托管静态网站</h2>

如果你只需要博客或文档，可以从这里独立开始。GitHub Pages 托管生成后的 HTML、CSS 和 JavaScript，省去了设备、数据库和隧道的维护。评论等功能是否需要外部服务，取决于具体实现；站内搜索也可以由浏览器本地完成。

<h3 id="heading-12">1 创建站点仓库</h3>

创建用户站点时，仓库名使用 `USERNAME.github.io`，其中 `USERNAME` 换成自己的 GitHub 用户名。项目仓库也可以发布 Pages，但默认路径会多一层仓库名。

<h3 id="heading-13">2 准备要发布的静态文件</h3>

手写页面可以从 `index.html` 开始，确保图片、样式和脚本的相对路径正确。使用 Hexo 时，先按后面的构建步骤生成网站，再发布 `public/` 的内容。

先在本机预览，确认无误后再决定是否提交和推送。上传文件或执行 `git push` 属于发布流程的一部分，与本地预览分开进行。

<h3 id="heading-14">3 选择一种发布方式</h3>

在仓库的 **Settings → Pages → Build and deployment** 中选择来源：

- **Deploy from a branch**：适合直接发布静态文件，选择实际放置成品的分支及根目录或 `docs` 目录。
- **GitHub Actions**：适合在工作流中运行 Hexo 等构建工具，再发布生成的文件。

两种方式选一种即可。使用 Actions 时，发布对象应为构建产物，具体流程可参照 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。本站当前使用 Hexo 配合 GitHub Actions。

<h3 id="heading-15">4 自定义域名与 HTTPS</h3>

先在 Pages 设置中添加自己的域名，再按 [GitHub 官方域名配置说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)设置 DNS：子域名通常使用 CNAME，根域名使用官方支持的 A、ALIAS 或 ANAME 等记录。

从分支发布时，域名设置可能产生 `CNAME` 文件；使用自定义 Actions 工作流时，应以仓库 Pages 设置为准，不能只靠一个 `CNAME` 文件完成绑定。等待 DNS 和证书准备好后，再启用 **Enforce HTTPS**。[GitHub Pages HTTPS 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

<h3 id="heading-16">5 使用 Hexo 生成博客</h3>

新建一个 Hexo 博客，可以按以下顺序操作：

```bash
npm install -g hexo-cli
hexo init blog
cd blog
npm install
hexo new 'Hello World'
hexo server --ip 127.0.0.1
```

最后一条命令用于本地预览。完成检查后，按 `Ctrl+C` 停止，再生成静态文件：

```bash
hexo generate
```

产物位于 `public/`。接着按自己选择的分支或 Actions 方案发布，避免把“生成成功”当成“已经上线”。Hexo 的安装要求和命令参数可查看 [官方文档](https://hexo.io/docs/)。

**维护本站现有项目时，不需要重新执行 `hexo init`。** 双击本地后台快捷方式即可管理文章；`npm run check` 用于构建与检查，是否上传或发布仍单独决定。
