(function () {
  function initHeader() {
    var header = document.querySelector('[data-site-header]');
    if (!header) {
      return;
    }

    var burger = header.querySelector('[data-burger]');
    var panel = header.querySelector('[data-mobile-menu]');
    if (!burger || !panel) {
      return;
    }

    function isOpen() {
      return header.classList.contains('menu-open');
    }

    function openMenu() {
      header.classList.add('menu-open');
      burger.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
      if (isOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    /* ===== Burger ===== */
    burger.addEventListener('click', function () {
      toggleMenu();
    });

    /* ===== Close after navigation ===== */
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    /* ===== Click outside ===== */
    document.addEventListener('click', function (event) {
      if (isOpen() && !header.contains(event.target)) {
        closeMenu();
      }
    });

    /* ===== Escape ===== */
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        closeMenu();
        burger.focus();
      }
    });

    /* ===== Reset after switching to desktop ===== */
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && isOpen()) {
        closeMenu();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader, { once: true });
  } else {
    initHeader();
  }
})();
