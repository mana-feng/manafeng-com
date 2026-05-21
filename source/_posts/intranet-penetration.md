---
title: 内网穿透服务器搭建入门
date: 2023-08-03 13:50:52
categories:
  - 技术教程
---

<p>我的这个小网站在一两年前就已经搭建了出来</p><p>但是当时买到的服务器的配置过低，只有1H1G，因为运行内存太低，所以经常导致nginx崩溃</p><p>虽然当时想提升配置，但是其他云服务器要么价格太高，要么需要备案</p><p>↓</p><p>中间找了很长时间，服务器也宕机了很长时间</p><p>最终搞了个natapp的内网穿透，搭配自己买的开发板，总算是稳定了下来</p><p>↓</p><p>以下是关于在orangepi上面搭建halo、配合natapp内网穿透，以及阿里云免费ssl证书申请及安装的整体流程</p><h1 id="heading-1">orange pi</h1><p>如果只是做网站的话，建议直接选择orangepi 4或者orangepi 5的4G版本，价格在200-400元之间</p><p>系统盘的话，我选择了一个64G的SD卡来作系统盘</p><p>当然，orangepi也支持nvme的固态硬盘，如果你有需要的话，也可以使用</p><h2 id="heading-2">刷写系统</h2><p>刷写系统的操作流程很简单，而且orangepi官方提供了相关的刷写工具——SDCardFormatter、win32diskimager</p><p>具体流程如下↓</p><ol><li><p>将SD卡连接电脑，通过SDCardFormatter将SD卡格式化为标准的系统卡</p></li><li><p>然后通过win32diskimager将选择好的系统刷写进去（镜像文件在www.orangepi.cn）</p></li></ol><p>↓</p><p>另外需要注意的是：orangepi使用的芯片为arm架构，非平常的amd架构</p><p>而arm架构在使用时相较于平常会有一定的限制，例如↓</p><ol><li><p>需要选择arm的镜像，并且使用相关的镜像源，否则无法运行（ubuntu的arm镜像源为ubuntu-ports）</p></li><li><p>部分第三方软件并没有支持arm架构，或者并没有支持orangepi的官方arm镜像（todesk、docker中的halo等等）</p></li></ol><p>当然这只是一些小问题，在安装或设置的时候稍微注意点就好</p><p>↓</p><p>在选择安装镜像的时候，我比较推荐直接使用官方提供的ubuntu-server镜像</p><p>因为官方的镜像里设置了自动获取ip地址，并且配置好了华为云的镜像源</p><p>在刚开始安装的时候，只需要连接路由器，然后通过内网地址直接xshell连接就行</p><p>如果你没有散热器的话，使用server镜像对于开发板的散热也有帮助</p><p>↓</p><p>修改镜像源：vim <strong>/etc/apt/sources.list</strong></p><p>ubuntu-ports镜像源推荐：</p><p>中科大：<a target="_blank" rel="noopener noreferrer nofollow" href="https://mirrors.ustc.edu.cn/">https://mirrors.ustc.edu.cn/</a></p><p>阿里云：<a target="_blank" rel="noopener noreferrer nofollow" href="https://developer.aliyun.com/mirror/">https://developer.aliyun.com/mirror/</a><br>华为云：<a target="_blank" rel="noopener noreferrer nofollow" href="https://mirrors.huaweicloud.com/home">https://mirrors.huaweicloud.com/home</a></p><p>清华：<a target="_blank" rel="noopener noreferrer nofollow" href="https://mirrors.tuna.tsinghua.edu.cn/">https://mirrors.tuna.tsinghua.edu.cn/</a></p><p>南京大学：<a target="_blank" rel="noopener noreferrer nofollow" href="https://mirrors.nju.edu.cn/">https://mirrors.nju.edu.cn/</a></p><p></p><h1 id="heading-3">halo</h1><p>因为arm架构的原因，docker中的halo并不能直接的在orangepi上面安装使用</p><p>所以建议直接使用docker compose的安装方式来安装</p><p>↓</p><p>另外需要注意：</p><p>在v2版本中，docker compose的命令从之前的docker-compose更改为了docker compose</p><p>在运行命令时注意修改</p><h2 id="heading-4">docker compose安装</h2><p>以下为具体安装步骤：</p><p>1、卸载系统内老版docker或其他冲突包：</p><pre><code>for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done</code></pre><p>2、安装必要的系统工具：</p><pre><code>sudo apt-get update

#以上镜像可以选择其中一个，也可以都写
#上面的账号密码等信息可自行选择，不要使用默认</code></pre><p>3、启动halo服务</p><pre><code>docker-compose up -d</code></pre><p>以上即安装好halo，可以通过http://内网ip/8090，或http://内网ip/8090/console访问自己的网站了</p><h1 id="heading-6">网络设置</h1><p>因为这一次的网站，我是搭建在自己的orangepi开发板，并且连的是没有公网ip的家庭宽带</p><p>所以在网络设置上面，我选择了natapp的内网穿透，搭配上阿里云申请到的免费ssl证书，实现https访问</p><p>是的，骑着单车去酒吧，该省省该花花</p><p>↓</p><p>ssl证书自行去阿里云申请（当然也可以去淘宝找找），并放在orangepi中任意位置，这里不再赘述</p><p></p><h2 id="heading-7">nginx反代</h2><p>因为我们这一次的安装是基于内网，而且后面要添加ssl证书实现443端口访问</p><p>所以此处的nginx反代和halo官方的设置并不相同</p><p>↓</p><p>1、安装nginx</p><pre><code>sudo apt-get update
sudo apt-get install nginx -y</code></pre><p>2、配置nginx反代</p><p>编辑nginx配置文件：</p><pre><code>sudo vim /etc/nginx/sites-available/default</code></pre><p>将server块修改为如下内容：</p><pre><code>server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}</code></pre><p>3、测试并重启nginx</p><pre><code>sudo nginx -t
sudo systemctl restart nginx</code></pre><h2 id="heading-8">natapp内网穿透</h2><p>1、前往natapp官网注册账号，购买隧道（免费隧道也可以，但域名随机且不稳定）</p><p>2、下载natapp客户端，放到orangepi中</p><pre><code>chmod +x natapp
./natapp -authtoken=你的authtoken</code></pre><p>3、将natapp设置为开机自启，可以使用systemd服务</p><pre><code>sudo vim /etc/systemd/system/natapp.service</code></pre><p>写入以下内容：</p><pre><code>[Unit]
Description=natapp
After=network.target

[Service]
Type=simple
ExecStart=/path/to/natapp -authtoken=你的authtoken
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target</code></pre><p>启用服务：</p><pre><code>sudo systemctl enable natapp
sudo systemctl start natapp</code></pre><h2 id="heading-9">SSL证书配置</h2><p>1、将阿里云申请的SSL证书（.pem和.key文件）放到orangepi中，例如放在 /etc/nginx/ssl/ 目录下</p><p>2、修改nginx配置，添加443端口监听：</p><pre><code>server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}</code></pre><p>3、测试并重启nginx</p><pre><code>sudo nginx -t
sudo systemctl restart nginx</code></pre><h1 id="heading-10">总结</h1><p>以上就是一套完整的基于Orange Pi + Halo + natapp + nginx + SSL的内网穿透建站方案</p><p>整体成本极低，适合个人博客、测试站点等场景</p><p>当然，如果网站流量较大或者对稳定性要求较高，还是建议购买正规的云服务器</p>


<h1 id="heading-11">GitHub Pages 纯静态网站搭建</h1>
<p>除了使用 Orange Pi 自建服务器外，GitHub Pages 也是一个非常不错的选择，特别适合托管纯静态网站</p>
<p>GitHub Pages 完全免费，无需维护服务器，且自带 CDN 加速，适合个人博客、文档站点、项目展示等场景</p>
<p>↓</p>

<h2 id="heading-12">创建仓库</h2>
<p>1、登录 GitHub，点击右上角 "+" 号，选择 "New repository"</p>
<p>2、仓库名称格式为 <code>username.github.io</code>，其中 username 为你的 GitHub 用户名</p>
<p>3、选择公开仓库（Public），然后点击创建</p>
<p>↓</p>

<h2 id="heading-13">上传网站文件</h2>
<p>可以通过以下两种方式上传静态网站文件：</p>
<p>方式一：直接上传</p>
<ol>
<li>进入仓库页面，点击 "Add file" → "Upload files"</li>
<li>拖拽或选择本地的 HTML/CSS/JS 文件上传</li>
<li>点击 "Commit changes" 提交</li>
</ol>
<p>方式二：使用 Git 命令行</p>
<pre><code># 克隆仓库到本地
git clone https://github.com/username/username.github.io.git

# 进入仓库目录
cd username.github.io

# 添加你的静态网站文件（如 index.html）
# 然后提交并推送
git add .
git commit -m "Initial commit"
git push origin main</code></pre>
<p>↓</p>

<h2 id="heading-14">启用 GitHub Pages</h2>
<p>1、进入仓库的 "Settings" 页面</p>
<p>2、左侧菜单选择 "Pages"</p>
<p>3、在 "Source" 部分，选择分支（通常为 main 或 master），文件夹选择 "/ (root)"</p>
<p>4、点击 "Save" 保存</p>
<p>5、等待几分钟后，访问 <code>https://username.github.io</code> 即可看到你的网站</p>
<p>↓</p>

<h2 id="heading-15">自定义域名（可选）</h2>
<p>如果你有自己的域名，可以绑定到 GitHub Pages：</p>
<ol>
<li>在仓库根目录创建名为 <code>CNAME</code> 的文件，内容为你的域名（如 <code>www.example.com</code>）</li>
<li>在你的域名 DNS 服务商处添加 CNAME 记录，指向 <code>username.github.io</code></li>
<li>在 GitHub Pages 设置中，勾选 "Enforce HTTPS" 以启用 SSL</li>
</ol>
<p>↓</p>

<h2 id="heading-16">使用 Hexo/Hugo 等静态网站生成器</h2>
<p>对于博客类网站，推荐使用静态网站生成器：</p>
<p>以 Hexo 为例：</p>
<pre><code># 安装 Hexo
npm install -g hexo-cli

# 初始化博客
hexo init blog
cd blog
npm install

# 创建新文章
hexo new "Hello World"

# 生成本地预览
hexo server

# 生成静态文件
hexo generate

# 部署到 GitHub Pages（需配置 _config.yml 中的 deploy 部分）
hexo deploy</code></pre>
<p>Hexo 和 Hugo 都提供了丰富的主题，可以快速搭建美观的博客站点</p>
<p>↓</p>

<p>GitHub Pages 方案的优势在于零成本、高可用、无需维护，但仅支持静态内容，无法运行动态程序</p>
<p>如果需要动态功能（如评论、搜索），可以配合 GitHub Issues、Giscus、Algolia 等第三方服务实现</p>
