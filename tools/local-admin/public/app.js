'use strict';

let state, page = 'posts', current = null, originalForm = null, termEdit = null, noticeTimer;
let query = '', categoryFilter = '', busy = false;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const tags = value => [...new Set(value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean))];
function message(text, error = false) {
  const box = $('#message'); box.textContent = text; box.className = error ? 'error' : ''; box.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { box.hidden = true; }, error ? 10000 : 5000);
}
async function write(route, input) {
  const response = await fetch('/api/' + route, { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Local-Token':state.token }, body:JSON.stringify(input) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || '保存失败'); return data;
}
async function refresh() {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error('无法读取本地内容，请检查后台是否仍在运行');
  state = await response.json();
  for (const key of ['posts','categories','tags','media']) $('#count-' + key).textContent = key === 'posts' || key === 'media' ? state[key].length : state.taxonomy[key].length;
  $('#category-options').innerHTML = state.taxonomy.categories.map(item => `<option value="${esc(item.name)}"></option>`).join('');
}
function getForm() {
  return { title:$('#post-title').value, category:$('#post-category').value, tags:tags($('#post-tags').value), index_img:$('#post-cover').value, body:$('#post-body').value };
}
function dirty() { return current && originalForm && JSON.stringify(getForm()) !== JSON.stringify(originalForm); }
function leave() { return !dirty() || confirm('有尚未保存的修改。确定离开吗？修改不会自动保存。'); }
function updateDirty() { $('#save-state').innerHTML = dirty() ? '<strong>有未保存的修改</strong>' : '已与本地文件同步'; }
function setPage(next) {
  if (!leave()) return;
  current = null; originalForm = null; page = next;
  document.querySelectorAll('[data-page]').forEach(button => { if (button.dataset.page === page) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
  render();
}
function heading(title, subtitle, action = '') { return `<div class="page-heading"><div><h1>${title}</h1><p class="muted">${subtitle}</p></div>${action}</div>`; }
function render() {
  if (current) return renderEditor();
  if (page === 'posts') {
    $('#main').innerHTML = heading('文章', `${state.posts.length} 篇文章，所有保存仅写入本机文件。`, '<button class="primary" data-action="create">新建文章</button>') +
      `<div class="toolbar"><label class="sr-only" for="article-search">搜索文章</label><input id="article-search" type="search" placeholder="搜索标题、分类、标签或正文" value="${esc(query)}"><label class="sr-only" for="category-filter">筛选分类</label><select id="category-filter" aria-label="筛选分类"><option value="">全部分类</option>${state.taxonomy.categories.map(item => `<option${categoryFilter === item.name ? ' selected' : ''} value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select></div><div id="article-list" class="panel article-list"></div>`;
    $('#article-search').addEventListener('input', event => { query = event.target.value; renderList(); });
    $('#category-filter').addEventListener('change', event => { categoryFilter = event.target.value; renderList(); });
    return renderList();
  }
  if (page === 'categories' || page === 'tags') {
    const label = page === 'categories' ? '分类' : '标签';
    $('#main').innerHTML = heading(label, '统一整理名称，支持改名或合并同名项。') + `<form id="taxonomy-add" class="toolbar"><label class="sr-only" for="taxonomy-name">新${label}名称</label><input id="taxonomy-name" required maxlength="80" placeholder="新${label}名称"><button class="primary" type="submit">新增${label}</button></form><p class="hint">新名称在文章使用后才会出现在网站导航中。</p><div class="term-list">${state.taxonomy[page].map(item => `<section class="panel term-card"><h2>${esc(item.name)}</h2><p>${item.count} 篇文章</p><div class="term-actions"><button data-action="term-posts" data-name="${esc(item.name)}">查看文章</button><button data-action="rename" data-name="${esc(item.name)}">改名 / 合并</button></div></section>`).join('') || '<p class="empty">还没有名称，可以先新增一个。</p>'}</div>`;
    $('#taxonomy-add').addEventListener('submit', async event => {
      event.preventDefault(); await perform(async () => { await write('taxonomy/add',{ kind:page, name:$('#taxonomy-name').value }); await refresh(); render(); message('名称已保存到本机'); });
    });
    return;
  }
  $('#main').innerHTML = heading('图片', `${state.media.length} 张本地图片。上传会保留原文件名，同名文件不会被覆盖。`, '<button class="primary" data-action="upload">添加图片</button>') +
    `<input type="file" id="image-upload" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" multiple hidden><div class="media-grid">${state.media.map(item => `<article class="panel media-card"><img src="/media/${encodeURIComponent(item.name)}" alt="${esc(item.name)}" loading="lazy"><div class="media-name">${esc(item.name)}</div><p>${Math.ceil(item.size/1024)} KB · ${item.references.length ? '正在使用' : '未发现引用'}</p><div class="media-actions"><button data-action="copy" data-url="${esc(item.url)}">复制路径</button>${!item.references.length ? `<button class="danger" data-action="delete-image" data-name="${esc(item.name)}">删除</button>` : ''}</div></article>`).join('') || '<p class="empty">还没有图片，可以添加一张。</p>'}</div>`;
  $('#image-upload').addEventListener('change', async event => {
    const files = [...event.target.files];
    await perform(async () => {
      let saved = 0; const failures = [];
      for (const file of files) {
        try {
          if (file.size > 8 * 1024 * 1024) throw new Error('超过 8 MB');
          const content = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
          await write('media/upload',{ name:file.name, content }); saved++;
        } catch (error) { failures.push(file.name + '：' + error.message); }
      }
      await refresh(); render(); message(failures.length ? `已保存 ${saved} 张。${failures.join('；')}` : `已保存 ${saved} 张图片到本机`, !!failures.length);
    });
  });
}
function renderList() {
  const q = query.trim().toLowerCase();
  const filtered = state.posts.filter(post => (!categoryFilter || post.category === categoryFilter) && (!q || [post.title,post.category,...post.tags,post.body].join(' ').toLowerCase().includes(q)));
  $('#article-list').innerHTML = filtered.map(post => `<article class="article-row"><div><button class="article-title" data-action="edit" data-id="${esc(post.id)}">${esc(post.title)}</button><div class="article-meta"><span class="chip category">${esc(post.category || '未分类')}</span>${post.tags.map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}</div></div><time class="row-date">${esc(post.date.slice(0,10))}</time><button data-action="edit" data-id="${esc(post.id)}">编辑</button></article>`).join('') || '<p class="empty">没有找到匹配的文章。</p>';
}
function openPost(id) { current = state.posts.find(post => post.id === id); if (current) renderEditor(); }
function renderEditor() {
  const post = current;
  $('#main').innerHTML = `<button class="back" data-action="back">← 返回文章列表</button>` + heading('编辑文章', '保存前会备份原文件；调整分类或标签时不会改写正文。') +
    `<form id="post-form"><div class="panel edit-grid"><label class="wide">标题<input id="post-title" maxlength="300" required value="${esc(post.title)}"></label><label>分类<input id="post-category" list="category-options" required value="${esc(post.category)}"></label><label>标签<input id="post-tags" value="${esc(post.tags.join('，'))}" placeholder="多个标签用逗号分隔"></label><label>发布时间（固定）<input readonly value="${esc(post.date)}"></label><label>文件名（固定）<input readonly value="${esc(post.id)}"></label><label class="wide">本地预览地址<input readonly value="http://127.0.0.1:4317${esc(post.url)}"><a href="http://127.0.0.1:4317${esc(post.url)}" target="_blank" rel="noopener noreferrer">查看本地文章 ↗</a></label><label class="wide">列表封面<select id="post-cover"><option value="">不设置封面</option>${state.media.map(item => `<option value="${esc(item.url)}"${post.index_img === item.url ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label class="wide">正文原文<textarea id="post-body" class="body-input" spellcheck="false">${esc(post.body)}</textarea></label><p class="hint wide">现有 HTML、表格和目录锚点保留原样。图片可以从图片库复制路径，使用 /images/文件名 引用。</p></div><div class="savebar"><span id="save-state">已与本地文件同步</span><button type="submit" class="primary" id="save-button">保存到本机</button></div></form>`;
  originalForm = getForm();
  $('#post-form').addEventListener('input', updateDirty);
  $('#post-form').addEventListener('change', updateDirty);
  $('#post-form').addEventListener('submit', async event => {
    event.preventDefault();
    await perform(async () => {
      const values = getForm(), input = { id:current.id, revision:current.revision };
      for (const key of Object.keys(values)) if (JSON.stringify(values[key]) !== JSON.stringify(originalForm[key])) input[key] = values[key];
      const result = await write('posts/save', input);
      const id = current.id; await refresh(); openPost(id);
      message(result.changed ? '已保存到本机，修改前的文件已备份' : '没有需要保存的修改，原文件保持不变');
    });
  });
}
async function perform(action) {
  if (busy) return;
  busy = true;
  const controls = [...document.querySelectorAll('button,input,textarea,select')].filter(control => !control.disabled);
  controls.forEach(control => { control.disabled = true; });
  $('#main').setAttribute('aria-busy','true');
  try { await action(); } catch (error) { message(error.message || '操作失败，请重试', true); }
  finally { busy = false; controls.forEach(control => { if (control.isConnected) control.disabled = false; }); $('#main').removeAttribute('aria-busy'); }
}
document.addEventListener('click', async event => {
  if (busy && event.target.closest('a,button')) { event.preventDefault(); return; }
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.page) return setPage(button.dataset.page);
  if (button.dataset.close) return $('#' + button.dataset.close).close();
  const action = button.dataset.action;
  if (action === 'edit') return openPost(button.dataset.id);
  if (action === 'back') return setPage('posts');
  if (action === 'create') { $('#create-form').reset(); $('#create-form').elements.category.value = state.taxonomy.categories[0]?.name || ''; return $('#create-dialog').showModal(); }
  if (action === 'rename') {
    termEdit = { kind:page, from:button.dataset.name };
    $('#term-heading').textContent = page === 'categories' ? '分类改名或合并' : '标签改名或合并';
    $('#term-description').textContent = '将所有相关文章中的“' + termEdit.from + '”改为新名称。';
    $('#term-form').elements.name.value = termEdit.from;
    return $('#term-dialog').showModal();
  }
  if (action === 'term-posts') { query = page === 'tags' ? button.dataset.name : ''; categoryFilter = page === 'categories' ? button.dataset.name : ''; return setPage('posts'); }
  if (action === 'upload') return $('#image-upload').click();
  if (action === 'copy') {
    try { await navigator.clipboard.writeText(button.dataset.url); message('图片路径已复制'); }
    catch { message('图片路径：' + button.dataset.url); }
  }
  if (action === 'delete-image' && confirm('确定删除未被引用的图片“' + button.dataset.name + '”吗？删除前会保存本地备份。')) await perform(async () => { await write('media/delete',{ name:button.dataset.name }); await refresh(); render(); message('图片已移至本地备份'); });
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); }));
$('#create-form').addEventListener('submit', async event => {
  event.preventDefault(); await perform(async () => {
    const form = event.target;
    const result = await write('posts/create',{ slug:form.elements.slug.value, title:form.elements.title.value, category:form.elements.category.value, tags:[] });
    $('#create-dialog').close(); await refresh(); page='posts'; openPost(result.post.id); message('本地文章已创建，可以开始编辑正文');
  });
});
$('#term-form').addEventListener('submit', async event => {
  event.preventDefault(); await perform(async () => { const result = await write('taxonomy/rename',{ ...termEdit, to:event.target.elements.name.value }); $('#term-dialog').close(); await refresh(); render(); message(`已更新 ${result.count || 0} 篇本地文章，正文和文章地址保持不变`); });
});
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue=''; } });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='s' && current) { event.preventDefault(); $('#post-form').requestSubmit(); } });
refresh().then(render).catch(error => { $('#main').textContent=error.message; });
