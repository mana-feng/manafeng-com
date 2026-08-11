/* 首页右侧分类筛选：选中分类的文章保留，其余隐藏 */
(function () {
  'use strict';

  function init() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card'));
    if (!cards.length) return;

    var counts = {};
    cards.forEach(function (card) {
      var link = card.querySelector('.post-metas a[href*="/categories/"]');
      var name = link ? link.textContent.trim() : '';
      card.setAttribute('data-category', name);
      if (name) counts[name] = (counts[name] || 0) + 1;
    });

    var names = Object.keys(counts);
    if (!names.length) return;

    var panel = document.createElement('aside');
    panel.id = 'category-filter';
    panel.setAttribute('aria-label', '分类筛选');

    var title = document.createElement('div');
    title.className = 'category-filter-title';
    title.textContent = '分类筛选';
    panel.appendChild(title);

    var list = document.createElement('div');
    list.className = 'category-filter-items';
    panel.appendChild(list);

    function makeItem(label, cat, count) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'category-filter-item';
      item.setAttribute('data-cat', cat);
      item.textContent = count === null ? label : label + ' (' + count + ')';
      list.appendChild(item);
      return item;
    }

    var allItem = makeItem('全部', '', cards.length);
    allItem.classList.add('active');
    names.sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (name) {
      makeItem(name, name, counts[name]);
    });

    function update() {
      var actives = list.querySelectorAll('.category-filter-item.active[data-cat]:not([data-cat=""])');
      var selected = {};
      Array.prototype.forEach.call(actives, function (el) {
        selected[el.getAttribute('data-cat')] = true;
      });
      var noFilter = actives.length === 0;
      allItem.classList.toggle('active', noFilter);
      cards.forEach(function (card) {
        var show = noFilter || selected[card.getAttribute('data-category')];
        card.style.display = show ? '' : 'none';
      });
    }

    list.addEventListener('click', function (e) {
      var item = e.target.closest('.category-filter-item');
      if (!item) return;
      if (item === allItem) {
        Array.prototype.forEach.call(list.querySelectorAll('.category-filter-item'), function (el) {
          el.classList.remove('active');
        });
      } else {
        item.classList.toggle('active');
      }
      update();
    });

    cards[0].parentNode.insertBefore(panel, cards[0]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
