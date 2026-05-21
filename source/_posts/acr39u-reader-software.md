---
title: 接触式磁卡读卡器软件
date: 2023-01-19 18:22:26
categories:
  - 接触式磁卡入门
tags:
  - 接触式磁卡
---

<p>为了配合接触式磁卡嗅探器的使用，以及方便复制修改卡片的内容，我开发了两款读卡器软件</p>

<p>分别支持明华澳汉 SRD-U100 和 ACS ACR39U 两款主流接触式 IC 卡读写器</p>

<h1 id="heading-1">明华澳汉 SRD-U100 读写器</h1>

<p>这是基于明华澳汉官方 MWIC_32.dll 库开发的 Python 程序，提供 GUI 和 CLI 两种操作模式</p>

<p>支持 Windows 平台，需要 Python 3.8+（32 位）</p>

<h2 id="heading-2">功能特性</h2>

<p>这款软件的功能还是比较全面的↓</p>

<ol>
<li>自动搜索并连接读写器，支持 COM / USB / HID 端口</li>
<li>自动检测卡片类型，支持 AT24C 系列、SLE 系列、AT88C 系列等多种卡片</li>
<li>卡片数据的读取、编辑与写入</li>
<li>SLE4442 / SLE4428 密码验证与修改</li>
<li>保护位的读取与写入</li>
<li>数据导入导出，支持二进制文件</li>
<li>蜂鸣器控制</li>
<li>GUI 十六进制编辑器，支持实时修改高亮</li>
</ol>

<h2 id="heading-3">使用方法</h2>

<p>GUI 模式适合日常使用，CLI 模式适合批量操作和脚本调用</p>

<p>具体使用说明和代码已经上传到 GitHub：</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/mana-feng/Mingwah-SRD-U100">https://github.com/mana-feng/Mingwah-SRD-U100</a></p>

<h1 id="heading-4">ACS ACR39U 读写器</h1>

<p>这是基于 ACS 官方 PC/SC 接口库开发的 Python 程序，同样提供 GUI 和 CLI 两种模式</p>

<p>支持 Windows / Linux / macOS 平台，需要 Python 3.8+</p>

<h2 id="heading-5">功能特性</h2>

<p>在原厂软件的基础上，我增加了一些实用功能↓</p>

<ol>
<li>一键读写卡片数据</li>
<li>导出导入文件功能</li>
<li>支持 ISO 14443 Type A/B 卡片</li>
<li>自动识别卡片类型</li>
<li>十六进制数据编辑器</li>
<li>支持 APDU 命令自定义发送</li>
</ol>

<h2 id="heading-6">使用方法</h2>

<p>使用前需要安装 PC/SC 驱动，Windows 系统会自动安装，Linux 系统需要安装 pcscd 服务</p>

<p>具体使用说明和代码已经上传到 GitHub：</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/mana-feng/ACR39U-card-reader">https://github.com/mana-feng/ACR39U-card-reader</a></p>

<h1 id="heading-7">注意事项</h1>

<p>这两款软件都是我在搞 PCB 和嗅探器的同时开发的，主要是为了方便自己使用</p>

<p>代码已经开源，如果有任何问题或者建议，欢迎在 GitHub 上提 Issue</p>

<p><strong>注意：</strong>使用读卡器进行卡片操作时，请确保你有合法的使用权限，不要用于非法用途</p>
