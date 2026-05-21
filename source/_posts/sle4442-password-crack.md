---
title: SLE4442/4428 卡密码破解嗅探
date: 2023-01-19 17:57:23
categories:
  - 接触式磁卡入门
tags:
  - 接触式磁卡
---

<p>在日常生活中，最常见的接触式磁卡就是西门子的 SLE4442 4428 卡</p>

<p>因为其价格低廉，操作简单，具有加密能力等优点，所以类似：电梯卡、驾校卡、电卡、水卡等等，很多使用的都是这种磁卡</p>

<p>本篇文章所指的接触式磁卡就是这两种磁卡</p>

<p>以下将通过接触式磁卡的特点来详细说明下磁卡密码的嗅探方法</p>

<h1 id="heading-1">卡片特点</h1>

<h2 id="heading-2">数据存储</h2><p>4442 卡的存储区可保存 256 字节数据，密码区为 3 字节，默认密码为 FF FF FF，错误计数为 3 次，数据地址为 00-FF。</p>

<p>4428 卡的存储区可保存 1024 字节数据，密码区为 2 字节，默认密码为 FF FF，错误计数为 8 次，数据地址为 00 00 - 03 FF。</p>

<p>错误计数即是卡片可以验证密码错误的次数，每错一次计数减 1，直到错误计数为 0 卡片报废。但是在错误计数归零之前，如果你验证正确一次，那么计数就会被重置。</p>

<p>4442 卡的错误计数和密码，一般存在另外的保护区中，平常读写时看不到。</p>

<p>4428 卡的错误计数和密码，一般存在数据区的 03 FD-03 FF 中，通常为 FF XX XX，平时读写时能够直接看到。</p>

<p>4442 卡和 4428 卡的密码和错误计数，在未经过卡机验证的情况下，默认为 00。在这个时候读取的话，什么都读不到。但是在卡机验证过密码，且密码验证正确的情况下，就会一直显示，直到卡片断电，而这个时候，我们就能直接通过读卡器读取卡片的密码。</p>

<h2 id="heading-3">芯片触点</h2><p><img src="/images/chudian1.jpg" alt="chudian1.jpg" width="1246" height="459"><img src="/images/chudian2-1.jpg" alt="chudian2-1.jpg" width="1109" height="399">
</p>


<p>八脚的 4428 以及六脚的 4442 卡的触点信息如上所示，其实两种卡片的触点基本一致，只不过 4428 多了 c4、c8 两个空接的脚</p>

<p><strong>注意：</strong>只有了解清楚卡片触点位置和含义才能更方便地进行下面的嗅探，所以不要忽视这两张图</p>

<h2 id="heading-4">芯片通讯</h2><p>市面上的接触式磁卡的通讯都是依靠电信号来传输的芯片上面的 I/O 和 CLK 两个触点，一个负责数据输入输出</p>

<p>一个负责时钟信号 CLK 一次起伏对应 1bit 的数据，对应的 I/O 如果是低位即为 0，高位即为 18bit 合在一起看就组成了 1Bytes 的 16 进制数据，用来支持卡片和卡机之间的通讯就类似于</p>

<p>↓</p><blockquote><p>此图片来自二狗的个人博客</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.smileat.me">www.smileat.me</a>
</p></blockquote><p><img src="/images/%E7%94%B5%E5%B9%B3%E4%BF%A1%E5%8F%B7.png" alt="电平信号.png" width="996" height="249">
</p>


<h1 id="heading-5">嗅探方法</h1><p>经过上面对于卡片特性的了解，我们可以通过磁卡的两种特性来获取卡片的密码</p>

<h2 id="heading-6">带电校验</h2><p>在数据存储中，我们说到卡片的密码在未验证正确的时候，在卡片内是不显示的，此时无论用任何读卡器都无法获取密码</p>

<p>但是在验证正确之后就会一直保存在卡片里面，直到卡片断电才会消失因此我们可以使用外接电源来给卡片供电，让卡片在卡机里验证正确之后保持通电的状态，转移到读卡器里面，然后直接读取卡片的密码原理图如下↓</p><blockquote><p>此图片来自二狗的个人博客</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.smileat.me">www.smileat.me</a>
</p></blockquote><p><img src="/images/%E5%B8%A6%E7%94%B5%E6%A0%A1%E9%AA%8C.png" alt="带电校验.png" width="927" height="480">
</p>


<p>二狗设计了一张正反可插，尾部开孔可以连接杜邦线的模拟卡</p>

<p>就是图片上带金手指的电路板卡片和卡托的供电是使用的充电宝供电</p>

<p>在二狗的帮助下，我复刻出了和图中一样的一整套嗅探设备</p>

<p>但是上面的图片只是一个大致的设计思路，在实际操作中可以再进行一些完善</p>

<p>于是我在这个基础上面做了一定的修改</p>

<p>↓</p><ol><li>将金手指板重新制作，后端换为 8pin 直排的端子台</li><li>给卡座重新设计了一套电路板，并且前端也使用了 8pin 直排的端子台，方便连接</li><li>电源换成了 3V 电子配合 pw5100 的 5V 升压芯片供电，给卡片提供了稳定的工作电压和电流</li></ol><p><strong>整体的 pcb 图、卡片开发手册以及升压芯片使用手册已经打包放在 https://</strong><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.aliyundrive.com/s/Hpb8SautNYL"><strong>www.aliyundrive.com/s/Hpb8SautNYL</strong></a><strong> 提取码：33wq</strong>
</p>

<p><strong>此方法整体所需的材料为：</strong>
</p><ol><li>MUP-C801 卡托 x1</li><li>8pin 直排端子台 x2</li><li>8pin 直排端子线 x1</li><li>3.3uh 贴片电感 x1</li><li>4.7nf 贴片电容 x1</li><li>22nf 贴片电容 x1</li><li>10uf 贴片电容 x1</li><li>3.3V2032 电子和电子座 x1</li><li>升压电路卡托底板 x1</li><li>模拟卡 x1</li><li>pw5100 芯片</li></ol>
<p>在上面的 pcb 图中，我当时为了省事没有标注清楚每个零件的位置</p>

<p>如果你看到 pcb 板之后不太清楚，请查看 pw5100 的开发手册</p>

<p>一共只有零零碎碎的几个零件，自己标记一下就行</p>

<p>ps：另留了两个空位在下方，可以自行加 10Ω以下贴片电阻或者贴片灯珠，但要剩余的供电能够支撑起卡片的工作电压，或者考虑其他的 3.3v 升压电路芯片</p>

<p><strong>注意：</strong>
</p><ol><li>本方法只是在提供嗅探的原理，以及一种可行方案，如果你有更好的办法，可以自行更换</li><li>此方法制作所需材料较多，但是制作完成后获取密码很简单，省去看电信号的时间</li><li>在焊接时，使用 300-330℃热风枪以及焊锡膏，会使焊接更方便</li></ol><h2 id="heading-7">截取电信号</h2><p>在芯片通讯中，我们说到卡片和卡机之间的通讯是通过电信号来进行传输，那么就有了另一种方法来获取卡片的密码</p>

<p>通过逻辑分析仪来截取电信号，然后通过截取到的电信号来分析出卡片的密码原理图如下↓</p><blockquote><p>此图片来自二狗的个人博客</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.smileat.me">www.smileat.me</a>
</p></blockquote><p><img src="/images/%E6%88%AA%E5%8F%96%E7%94%B5%E4%BF%A1%E5%8F%B7.png" alt="截取电信号.png" width="927" height="498">
</p>


<p>这里推荐 nanodla 的逻辑分析仪，因为他的配套软件操作起来没有那么复杂，而且分别有 typec 口和 usb 口两个版本</p>

<p>类似如下↓</p>

<p><img src="/images/%E9%80%BB%E8%BE%91%E5%88%86%E6%9E%90%E4%BB%AA.jpg" alt="逻辑分析仪.jpg" width="792" height="290">
</p>


<p>在连接逻辑分析仪时，我们需要连接卡托的 3、5、7 三个脚</p>

<p>3 为卡片的 CLK 时钟信号，接在逻辑分析仪的 CH0 上面</p>

<p>5 为卡片的 GND 电源地端，接在逻辑分析仪的 GND 上面</p>

<p>7 为卡片的 I/O 信息输入输出，接在逻辑分析仪的 CH1 上面</p>

<p>在采样的时候，采样率选择为 2MHZ，采样大小越大越好</p>

<p>在得到的结果中，我们寻找如下图结果，将得到的每 8 个 bit 从后往前重新排序，按照 4 个一组化为 16 进制数据</p>

<p><img src="/images/%E7%94%B5%E5%B9%B3%E4%BF%A1%E5%8F%B7.png" alt="电平信号.png" width="996" height="249">
</p>


<p><strong>注意：寻找命令字的过程很漫长，你要从上千个 bit 里面寻找到自己需要的信息，是一件很不容易的事</strong>
</p>

<p><strong>但是还好，一般卡片信息的认证字会出现在较靠后的位置，因此你可以直接将每一次获得的电信号从后往前看，会节省很多时间</strong>
</p>

<p>上面是 4442 卡的电信号，在整体的电信号中会出现三次，分别为 0x33 0x01，0x33 0x02，0x33 0x03</p>

<p>如果是 4428 卡的电信号，则会出现两次，认证字和地址字也会改变</p>

<p>4428 卡的认证字从 11001100 变为了 10110011，也就是 16 进制 0x33 变为了 0xcd↑（也可能是 11001101，我已经忘记了，可以自行测试）</p>

<p>地址字变为 0111 1111 和 1111 1111，也就是 16 进制 0xFE，0xFF</p>


<p><strong>另：截取电信号的方法虽然麻烦，但是在某些情况下比带电校验会好用一些</strong>
</p>

<p><strong>例如当你手里的磁卡，错误计数已经归零或者只有数据没有密码的时候</strong>
</p>

<p><strong>你就可以直接用锁死的老卡，或者将老数据写入使用默认密码的新卡</strong>
</p>

<p><strong>然后将这张卡放在卡托里用逻辑分析仪连接好，进行截取电信号，最后也能够得到卡片的密码</strong>
</p>

<p><strong>操作流程和上面一样</strong>
</p>


<p><strong>此方法整体所需材料为：</strong>
</p><ol><li>卡托底板 x1</li><li>模拟卡 x1</li><li>逻辑分析仪 x1</li><li>测试夹 x3</li></ol>
<p>如果对 4428 和 4442 卡的认证字和地址字有任何疑问，可以自行寻找开发手册，或者查看分享链接中的开发手册</p>

<p>整体的 pcb 图、卡片开发手册以及升压芯片使用手册已经打包放在 https://<a target="_blank" rel="noopener noreferrer nofollow" href="https://www.aliyundrive.com/s/Hpb8SautNYL">www.aliyundrive.com/s/Hpb8SautNYL</a> 提取码：33wq</p>


<p>另：在上面的链接中，我放了一个使用 delphi 编写的 dbmis6 的电卡管理软件</p>

<p>通过 ida-pro mcp 和 skill 的帮助，我在汇编语言中找到了卡片密码的相关校验算法，卡片密码通过金额以及次数的异或运算来生成并校验。另有部分卡片内数据的校验算法，并没有找到，在软件中并未包含任何有关校验和生成的代码。我猜测应该密码算法较为复杂无法直接反编译得出，或者是密码的生成和校验是在硬件级别进行的。</p>

<p>如果你有兴趣，并且精通汇编语言的话可以研究一下</p>

<pre><code class="language-java">----------------------------------------------------------------------------------------------------------------------------</code></pre>

<p>之前还有一篇关于读卡器软件的文章，我已经删除，并整合进了这篇文章中</p>

<p>在最早开始做这些东西的时候，嗅探器和读卡器软件都是一起做的，在搞 pcb 的同时，也搞了一下读卡器的软件，为 acr39u 读卡器的出场软件增加了一键读写卡和导出导入文件的功能，同时还有 srdu100 的读卡器软件。</p>

<p>这两份软件的代码已经上传到了 github，你可以直接从 github 下载。</p>

<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/mana-feng/ACR39U-card-reader">ACR39U 读卡器软件</a> | <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/mana-feng/Mingwah-SRD-U100">明华澳汉 SRD-U100 读卡器软件</a></p>

<pre><code class="language-java">这里是分割线----------------------------------------------------------------------------------------------------------------------------</code></pre>

<p><strong>感谢二狗对本篇文章提供的技术支持</strong><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.smileat.me"><strong>www.smileat.me</strong></a><strong> ←进入二狗的世界，感受二狗的人生</strong>
</p>

<p><strong>另附上二狗的 TG 链接，有想了解的可以加入：TG Group invite link base64：aHR0cHM6Ly90Lm1lL2pvaW5jaGF0L2IwNGNmaEJuVFdBMU5HWTk=</strong>
</p>

<p><strong>26 年更新：二狗在 tg 上消失近一年，账号即将被注销，群组可能解散。我添加了一个新的群组：fake doghouse，链接放在了友链中，可以自行加入。</strong>
</p>

<p><strong>（tg 链接无法打开请自行魔法上网，没有魔法请自行联系霍格沃兹）</strong>
</p>
