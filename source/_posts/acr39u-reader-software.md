---
title: ACR39U读卡器软件
date: 2023-01-19 18:22:26
categories:
  - 接触式磁卡入门
tags:
  - 接触式磁卡
---

<p style="">为了配合接触式磁卡嗅探器的使用，以及方便复制修改卡片的内容</p><p style="">我找到了ACS公司的ACR39U的读卡器以及他的开发包，本来看开发包里面的源码和开发手册很全，心里一激动以为拿到就能用</p><p style="">但是真正拿到手里面的时候，发现里面的功能和代码错误和缺失了很大一部分，没办法，只能自己拿着源码再摸索着修改</p><p style="">如果你对于此读卡器的开发有些感兴趣的话，可以看下下面的内容</p><p style="">如果你只是想找个能用的软件的话，可以直接到本片文章的最下方</p><p style=""><strong>注意</strong>：本篇文章使用的语言为JAVA</p><p style=""></p><h1 style="" id="%E5%86%99%E5%8D%A1%E6%96%B9%E6%B3%95%E4%BF%AE%E6%94%B9">写卡方法修改</h1><h2 style="" id="16%E8%BF%9B%E5%88%B6string%E8%BD%ACbyte">16进制String转byte</h2><p style="">磁卡里面的数据都是以byte存储，所以软件上免不了一个过程，就是String-byte-byte[]-String。</p><p style="">首先要解决的就是写数据与读数据时，他总是把一字节的16进制数据分成两个字节的字符，再写入字符的ascii值。</p><p style="">在读写方法里，我们看到一个charat↓</p><pre><code class="language-java"> for (counter = 0; counter &lt; temporaryData.length(); counter ++)      //line 999
	 data[counter] = (byte)temporaryData.charAt(counter);             //line 1000</code></pre><p style="">也就是说，这串代码会把所有读到的数据自动转换为char值，无论是读写都是。</p><p style="">于是，把这串代码码掉之后，我们重新换上了helper.java中的getbytes方法↓</p><pre><code class="language-java">	public static byte[] getBytes(String stringBytes, String delimeter)