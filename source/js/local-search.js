/* Project override of Fluid's search asset. Queries are literal text, never regex. */
(function () {
  'use strict';

  function init() {
    var modal = document.getElementById('modalSearch');
    var input = document.getElementById('local-search-input');
    var results = document.getElementById('local-search-result');
    if (!modal || !input || !results || modal.dataset.searchReady) return;
    modal.dataset.searchReady = 'true';

    var status = document.createElement('p');
    status.id = 'local-search-status';
    status.className = 'search-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    results.before(status);
    input.setAttribute('aria-describedby', status.id);
    var entries = null;
    var pending = null;
    var mobileReturnFocus = null;

    function plainText(html) {
      return new DOMParser().parseFromString(html, 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
    }

    function highlight(parent, text, terms) {
      var lower = text.toLowerCase();
      var cursor = 0;
      while (cursor < text.length) {
        var start = -1;
        var length = 0;
        terms.forEach(function (term) {
          var found = lower.indexOf(term, cursor);
          if (found !== -1 && (start === -1 || found < start || (found === start && term.length > length))) {
            start = found;
            length = term.length;
          }
        });
        if (start === -1) {
          parent.appendChild(document.createTextNode(text.slice(cursor)));
          break;
        }
        parent.appendChild(document.createTextNode(text.slice(cursor, start)));
        var mark = document.createElement('mark');
        mark.className = 'search-word';
        mark.textContent = text.slice(start, start + length);
        parent.appendChild(mark);
        cursor = start + length;
      }
    }

    function search() {
      results.replaceChildren();
      var query = input.value.trim();
      if (!entries) return;
      if (!query) {
        status.textContent = '输入关键词搜索文章';
        return;
      }
      var terms = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
      if (!terms.length) {
        status.textContent = '请输入文字或其他关键词';
        return;
      }
      var includeContent = !window.CONFIG || CONFIG.include_content_in_search !== false;
      var count = 0;
      entries.forEach(function (entry) {
        var title = entry.title.toLowerCase();
        var content = includeContent ? entry.content.toLowerCase() : '';
        if (!terms.every(function (term) { return title.includes(term) || content.includes(term); })) return;
        count++;
        var link = document.createElement('a');
        link.className = 'list-group-item list-group-item-action font-weight-bolder search-list-title';
        link.href = entry.url;
        highlight(link, entry.title, terms);
        results.appendChild(link);
        if (includeContent && entry.content) {
          var first = content.indexOf(terms[0]);
          var start = Math.max(0, first - 20);
          var snippet = entry.content.slice(start, start + 120);
          var paragraph = document.createElement('p');
          paragraph.className = 'search-list-content';
          if (start) paragraph.appendChild(document.createTextNode('…'));
          highlight(paragraph, snippet, terms);
          if (start + snippet.length < entry.content.length) paragraph.appendChild(document.createTextNode('…'));
          results.appendChild(paragraph);
        }
      });
      status.textContent = count ? '找到 ' + count + ' 篇文章' : '没有找到相关文章，请换个关键词';
    }

    function load() {
      if (entries) { search(); return; }
      if (pending) return;
      status.textContent = '正在加载搜索索引…';
      var path = window.CONFIG && CONFIG.search_path || '/local-search.xml';
      pending = fetch(path).then(function (response) {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.text();
      }).then(function (text) {
        var xml = new DOMParser().parseFromString(text, 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('Invalid search index');
        entries = Array.from(xml.querySelectorAll('entry')).map(function (entry) {
          var title = entry.querySelector('title');
          var content = entry.querySelector('content');
          var url = entry.querySelector('url');
          var href = new URL(url ? url.textContent : '/', location.href);
          return {
            title: title ? title.textContent.trim() : '未命名文章',
            content: content ? plainText(content.textContent) : '',
            url: href.protocol === 'http:' || href.protocol === 'https:' ?
              (href.origin === location.origin ? href.pathname + href.search + href.hash : href.href) : '/'
          };
        });
        search();
      }).catch(function () {
        results.replaceChildren();
        status.textContent = '搜索暂时不可用，请关闭后重新打开重试';
      }).finally(function () { pending = null; });
    }

    input.addEventListener('input', search);
    input.addEventListener('focus', load);
    if (window.jQuery) {
      jQuery(modal).on('show.bs.modal.siteSearch', function (event) {
        var trigger = event.relatedTarget;
        mobileReturnFocus = trigger && trigger.closest('#mobile-grid-menu') ?
          document.getElementById('navbar-toggler-btn') : null;
        load();
      });
      jQuery(modal).on('shown.bs.modal.siteSearch', function () { input.focus(); });
      jQuery(modal).on('hidden.bs.modal.siteSearch', function () {
        input.value = '';
        results.replaceChildren();
        status.textContent = '';
        if (mobileReturnFocus) {
          var target = mobileReturnFocus;
          mobileReturnFocus = null;
          // Run after Bootstrap's own return-focus handler for the hidden menu link.
          queueMicrotask(function () { target.focus(); });
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
