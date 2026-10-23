/* Small interaction enhancements; category navigation itself works without JavaScript. */
(function () {
  'use strict';

  function init() {
    if (document.documentElement.dataset.siteUiReady) return;
    document.documentElement.dataset.siteUiReady = 'true';
    document.querySelectorAll('.mobile-toc nav a').forEach(function (link) {
      link.addEventListener('click', function () { link.closest('details').open = false; });
    });

    var topButton = document.getElementById('scroll-top-button');
    function updateTopButton() {
      if (topButton) topButton.classList.toggle('site-backtop-visible', window.scrollY > 300);
    }
    window.addEventListener('scroll', updateTopButton, { passive: true });
    updateTopButton();

    var toggle = document.getElementById('navbar-toggler-btn');
    var menu = document.getElementById('mobile-grid-menu');
    var main = document.querySelector('main');
    var categories = document.querySelector('.site-category-nav');
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-controls', menu.id);
    toggle.setAttribute('aria-label', '导航菜单');

    function isOpen() { return innerWidth < 992 && menu.classList.contains('show'); }
    function syncMenu() {
      var open = isOpen();
      menu.toggleAttribute('inert', !open);
      menu.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      if (main) main.toggleAttribute('inert', open);
      if (categories) categories.toggleAttribute('inert', open);
    }
    function closeMenu() {
      menu.classList.remove('show');
      document.body.classList.remove('mobile-menu-open');
      var icon = toggle.querySelector('.animated-icon');
      if (icon) icon.classList.remove('open');
      var navbar = document.getElementById('navbar');
      if (navbar && window.scrollY < 50) navbar.classList.remove('top-nav-collapse');
      syncMenu();
    }
    new MutationObserver(syncMenu).observe(menu, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', syncMenu);
    document.addEventListener('keydown', function (event) {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        closeMenu();
        toggle.focus();
        event.preventDefault();
      } else if (event.key === 'Tab') {
        var stops = [toggle].concat(Array.from(menu.querySelectorAll('a[href],button')));
        var first = stops[0];
        var last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
        if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
      }
    });
    var search = menu.querySelector('#mobile-search-btn a');
    if (search) search.addEventListener('click', closeMenu);
    syncMenu();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
