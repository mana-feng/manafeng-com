'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const yaml = require('js-yaml');

class AdminError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new AdminError(status, message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const imageTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' };

function term(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[<>:"/\\|?*\x00-\x1f]/.test(value)) fail(400, '名称不能为空，且不能包含路径或特殊控制字符');
  return value.trim();
}

function createStore(root) {
  root = fs.realpathSync(root);
  function safe(relative, mustExist = false) {
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep)) fail(400, '文件位置无效');
    let current = root;
    for (const part of path.relative(root, target).split(path.sep)) {
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail(400, '不允许通过链接访问文件');
    }
    if (mustExist && !fs.existsSync(target)) fail(404, '文件不存在');
    return target;
  }
  function named(folder, name, mustExist = true) {
    if (typeof name !== 'string' || !name || path.basename(name) !== name || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /^[.]/.test(name) || /[. ]$/.test(name) || name.length > 180) fail(400, '文件名无效');
    if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) fail(400, '不能使用系统保留文件名');
    return safe(path.join(folder, name), mustExist);
  }
  function atomic(file, bytes, backup = true) {
    safe(path.relative(root, file));
    if (backup && fs.existsSync(file)) {
      const dir = safe('.local-admin/backups/' + Date.now() + '-' + crypto.randomUUID());
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(file, path.join(dir, path.basename(file)));
    }
    const tmp = file + '.' + crypto.randomUUID() + '.tmp';
    try { fs.writeFileSync(tmp, bytes, { flag: 'wx' }); fs.renameSync(tmp, file); }
    finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
  }
  function split(raw) {
    const text = raw.toString('utf8');
    const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/);
    if (!match) fail(400, '文章头部格式无法识别，请先检查源文件');
    const data = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, '文章信息格式无效');
    const tail = raw.subarray(Buffer.byteLength(match[0]));
    return { data, tail, body: tail.toString('utf8').replace(/^\r?\n/, ''), eol: match[0].includes('\r\n') ? '\r\n' : '\n' };
  }
  function pack(data, tail, eol) {
    const header = yaml.dump(data, { schema: yaml.JSON_SCHEMA, noRefs: true, lineWidth: -1 }).trimEnd().replace(/\n/g, eol);
    return Buffer.concat([Buffer.from('---' + eol + header + eol + '---'), tail]);
  }
  function load(id) {
    if (!id.endsWith('.md')) fail(400, '只允许编辑 Markdown 文章');
    const file = named('source/_posts', id);
    const raw = fs.readFileSync(file);
    return { id, file, raw, revision: hash(raw), ...split(raw) };
  }
  function view(post) {
    const date = String(post.data.date || '');
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let url = match ? `/${match[1]}/${match[2]}/${match[3]}/${post.id.slice(0, -3)}/` : '/';
    if (post.data.permalink) {
      try { const parsed = new URL(String(post.data.permalink), 'https://local.invalid/'); if (/^https?:$/.test(parsed.protocol)) url = parsed.pathname; } catch { /* Keep the date path. */ }
    }
    return { id: post.id, revision: post.revision, title: String(post.data.title || post.id), date, category: array(post.data.categories)[0] || '', tags: array(post.data.tags), index_img: post.data.index_img || '', body: post.body, url };
  }
  function posts() {
    return fs.readdirSync(safe('source/_posts', true)).filter(name => name.endsWith('.md') && !fs.lstatSync(path.join(root, 'source/_posts', name)).isSymbolicLink()).map(id => view(load(id))).sort((a, b) => b.date.localeCompare(a.date));
  }
  function registry() {
    const file = safe('.local-admin/taxonomy.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { categories: [], tags: [] };
  }
  function saveRegistry(value) {
    fs.mkdirSync(safe('.local-admin'), { recursive: true });
    atomic(safe('.local-admin/taxonomy.json'), Buffer.from(JSON.stringify(value, null, 2) + '\n'));
  }
  function taxonomy(items) {
    const stored = registry();
    const result = {};
    for (const kind of ['categories', 'tags']) {
      const counts = new Map(array(stored[kind]).map(name => [name, 0]));
      for (const post of items) for (const name of new Set(kind === 'categories' ? [post.category].filter(Boolean) : post.tags)) counts.set(name, (counts.get(name) || 0) + 1);
      result[kind] = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
    }
    return result;
  }
  function media(items) {
    const settings = ['_config.yml', '_config.fluid.yml'].filter(name => fs.existsSync(safe(name))).map(name => fs.readFileSync(safe(name), 'utf8')).join('\n');
    const articles = items.map(post => ({ title:post.title, raw:load(post.id).raw.toString('utf8') }));
    return fs.readdirSync(safe('source/images', true)).filter(name => imageTypes[path.extname(name).toLowerCase()] && fs.lstatSync(path.join(root, 'source/images', name)).isFile()).map(name => {
      named('source/images', name);
      const url = '/images/' + name;
      const references = articles.filter(post => post.raw.includes(name) || post.raw.includes(encodeURIComponent(name))).map(post => post.title);
      if (settings.includes(name) || settings.includes(encodeURIComponent(name))) references.push('站点设置');
      return { name, url, size: fs.statSync(named('source/images', name)).size, references };
    }).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }
  return {
    state() { const items = posts(); return { posts: items, taxonomy: taxonomy(items), media: media(items) }; },
    save(input) {
      const allowed = ['id', 'revision', 'title', 'category', 'tags', 'index_img', 'body'];
      if (Object.keys(input).some(key => !allowed.includes(key))) fail(400, '文件名、日期和永久链接不可修改');
      if (typeof input.id !== 'string') fail(400, '缺少文章标识');
      const old = load(input.id);
      if (input.revision !== old.revision) fail(409, '文章已被其他窗口或编辑器修改，请重新打开后再保存');
      const data = { ...old.data };
      if ('title' in input) { if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300) fail(400, '请填写有效标题'); data.title = input.title.trim(); }
      if ('category' in input) { const category = term(input.category); if (category !== array(data.categories)[0]) data.categories = [category]; }
      if ('tags' in input) { if (!Array.isArray(input.tags) || input.tags.length > 100) fail(400, '标签格式无效'); const tags = [...new Set(input.tags.map(term))]; if (!equal(tags, array(data.tags))) data.tags = tags; }
      if ('index_img' in input) {
        if (typeof input.index_img !== 'string' || (input.index_img && (!input.index_img.startsWith('/images/') || input.index_img.slice(8).includes('/')))) fail(400, '封面请从本地图片库选择');
        if (input.index_img) named('source/images', input.index_img.slice(8));
        if (input.index_img !== (data.index_img || '')) data.index_img = input.index_img;
      }
      let tail = old.tail;
      if ('body' in input) {
        if (typeof input.body !== 'string' || Buffer.byteLength(input.body) > 2 * 1024 * 1024) fail(400, '正文过长或格式无效');
        if (input.body.replace(/\r\n/g, '\n') !== old.body.replace(/\r\n/g, '\n')) tail = Buffer.from(old.eol + input.body.replace(/\r?\n/g, old.eol));
      }
      if (equal(data, old.data) && tail.equals(old.tail)) return { changed: false, post: view(old) };
      atomic(old.file, pack(data, tail, old.eol));
      return { changed: true, post: view(load(input.id)) };
    },
    create(input) {
      if (typeof input.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(input.slug) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(input.slug)) fail(400, '文件短名请使用小写英文、数字和连字符');
      const id = input.slug + '.md';
      const file = named('source/_posts', id, false);
      if (fs.existsSync(file)) fail(409, '这个文件短名已存在，请换一个');
      if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300) fail(400, '请填写标题');
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(part => [part.type, part.value]));
      const date = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
      const data = { title: input.title.trim(), date, categories: [term(input.category)], tags: [...new Set(array(input.tags).map(term))] };
      if (typeof input.body !== 'undefined' && typeof input.body !== 'string') fail(400, '正文格式无效');
      if (Buffer.byteLength(input.body || '') > 2 * 1024 * 1024 || array(input.tags).length > 100) fail(400, '正文或标签过多');
      const raw = pack(data, Buffer.from('\n\n' + (input.body || '') + '\n'), '\n');
      fs.writeFileSync(file, raw, { flag: 'wx' });
      return { post: view(load(id)) };
    },
    addTerm(input) {
      if (!['categories', 'tags'].includes(input.kind)) fail(400, '分类类型无效');
      const stored = registry();
      stored[input.kind] = [...new Set([...array(stored[input.kind]), term(input.name)])];
      saveRegistry(stored);
      return { changed: true };
    },
    renameTerm(input) {
      if (!['categories', 'tags'].includes(input.kind)) fail(400, '分类类型无效');
      const from = term(input.from), to = term(input.to);
      if (from === to) return { changed: false, count: 0 };
      const changes = [];
      for (const post of posts()) {
        const old = load(post.id), values = array(old.data[input.kind]);
        if (!values.includes(from)) continue;
        const data = { ...old.data, [input.kind]: [...new Set(values.map(name => name === from ? to : name))] };
        changes.push({ file: old.file, bytes: pack(data, old.tail, old.eol) });
      }
      for (const change of changes) atomic(change.file, change.bytes);
      const stored = registry();
      stored[input.kind] = [...new Set([...array(stored[input.kind]).map(name => name === from ? to : name), to])];
      saveRegistry(stored);
      return { changed: true, count: changes.length };
    },
    upload(input) {
      const file = named('source/images', input.name, false);
      const ext = path.extname(file).toLowerCase();
      if (!imageTypes[ext] || typeof input.content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.content)) fail(400, '请选择 PNG、JPEG、GIF、WebP 或 AVIF 图片');
      const bytes = Buffer.from(input.content, 'base64');
      if (!bytes.length || bytes.length > 8 * 1024 * 1024) fail(400, '图片大小应在 8 MB 以内');
      const header = bytes.subarray(0, 12), hex = header.toString('hex');
      const valid = ext === '.png' ? hex.startsWith('89504e470d0a1a0a') : /jpe?g/.test(ext) ? hex.startsWith('ffd8ff') : ext === '.gif' ? /^GIF8[79]a/.test(header.toString()) : ext === '.webp' ? header.toString().startsWith('RIFF') && header.toString().slice(8) === 'WEBP' : header.toString().slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(header.toString().slice(8));
      if (!valid) fail(400, '图片内容与扩展名不匹配');
      if (fs.existsSync(file)) fail(409, '同名图片已存在，请改名后上传；不会覆盖旧图片');
      fs.writeFileSync(file, bytes, { flag: 'wx' });
      return { url: '/images/' + input.name };
    },
    deleteImage(input) {
      const file = named('source/images', input.name);
      const item = media(posts()).find(image => image.name === input.name);
      if (!item) fail(400, '图片格式无效');
      if (item.references.length) fail(409, '图片仍被文章或站点设置引用，不能删除');
      const dir = safe('.local-admin/backups/' + Date.now() + '-' + crypto.randomUUID());
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(file, path.join(dir, input.name));
      fs.unlinkSync(file);
      return { changed: true };
    },
    image(name) { const file = named('source/images', name); const mime = imageTypes[path.extname(file).toLowerCase()]; if (!mime) fail(404, '图片不存在'); return { bytes: fs.readFileSync(file), mime }; }
  };
}

module.exports = { createStore, AdminError };
