(function () {
  function initProjects() {
    var root = document.querySelector('[data-projects-page]');
    if (!root) {
      return;
    }

    var wrap = root.querySelector('#views-wrap');
    if (!wrap) {
      return;
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealed = false;
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-project-item]'));
    var viewActive = root.querySelector('[data-view="active"]');
    var viewCompleted = root.querySelector('[data-view="completed"]');
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-status-tab]'));
    var tabsWrap = root.querySelector('[data-toggle]');
    var searchInput = root.querySelector('[data-search-input]');
    var sortWrap = root.querySelector('[data-sort]');
    var sortToggle = sortWrap ? sortWrap.querySelector('[data-sort-toggle]') : null;
    var sortLabel = root.querySelector('[data-sort-label]');
    var loadWrap = root.querySelector('[data-load-more-wrap]');
    var loadButton = root.querySelector('[data-load-more]');
    var emptyElement = root.querySelector('[data-empty]');
    var emptyText = root.querySelector('[data-empty-text]');
    var subtitle = root.querySelector('[data-subtitle]');

    var SUBTITLES = {
      active: 'Тут ви можете відстежувати статуси заявок, з якими ми працюємо',
      completed: 'Тут ви можете переглянути наше портфоліо із завершених проєктів'
    };

    var SORT_LABELS = {
      new: 'Спочатку новіші',
      old: 'Спочатку старіші'
    };

    var PER_PAGE = 6;

    /* ===== Initial state ======== */
    var params = new URLSearchParams(window.location.search);
    var state = {
      status: params.get('status') === 'completed' ? 'completed' : 'active',
      q: (params.get('q') || '').trim(),
      sort: params.get('sort') === 'old' ? 'old' : 'new',
      shown: PER_PAGE
    };

    /* ==== Helpers ====== */
    function getNumber(element, key) {
      return (parseInt(element.getAttribute('data-' + key), 10) || 0);
    }

    function setHidden(element, hidden) {
      if (!element) {
        return;
      }

      element.hidden = hidden;
    }

    function updateTabs() {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-status-tab') === state.status;
        tab.classList.toggle('is-active', active);
      });

      if (tabsWrap) {
        tabsWrap.classList.toggle('is-completed', state.status === 'completed');
      }
    }

    /* ======= Reveal ======= */
    function visibleRevealItems() {
      var container = state.status === 'active' ? viewActive : viewCompleted;
      if (!container) {
        return [];
      }

      return Array.prototype.filter.call(container.querySelectorAll('.reveal-item'), function (element) {
        return !element.hidden;
      });
    }

    function ensureRevealed() {
      visibleRevealItems().forEach(function (element) {
        element.classList.add('reveal-in');
      });
    }

    function staggerReveal() {
      var visible = visibleRevealItems();

      if (reduceMotion) {
        visible.forEach(function (element) {
          element.classList.add('reveal-in');
        });

        return;
      }

      visible.forEach(function (element) {
        element.classList.remove('reveal-in');
        element.style.transitionDelay = '';
      });

      void wrap.offsetWidth;

      visible.forEach(function (element, index) {
        element.style.transitionDelay = (Math.min(index, 8) * 0.06) + 's';
        element.classList.add('reveal-in');
      });
    }

    /* ==== URL ==== */
    function updateUrl() {
      var params = new URLSearchParams();

      if (state.status === 'completed') {
        params.set('status', 'completed');
      }

      if (state.q) {
        params.set('q', state.q);
      }

      if (state.sort === 'old') {
        params.set('sort', 'old');
      }

      var query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
    }

    /* ==== Main filtering / sorting ====== */
    function apply() {
      var isActive = state.status === 'active';
      var current = items.filter(function (item) {
        return (item.getAttribute('data-status') === state.status);
      });

      /* ===== Sort ===== */
      current.sort(function (a, b) {
        var firstTimestamp = getNumber(a, 'sort-value');
        var secondTimestamp = getNumber(b, 'sort-value');

        return state.sort === 'old' ? firstTimestamp - secondTimestamp : secondTimestamp - firstTimestamp;
      });

      current.forEach(function (item) {
        item.parentNode.appendChild(item);
      });

      /* ===== Search / pagination ===== */
      var normalizedQuery = state.q.toLocaleLowerCase('uk-UA');
      var matched = 0;

      current.forEach(function (item) {
        var searchText = item.getAttribute('data-search') || '';
        var matchesQuery = !normalizedQuery || searchText.indexOf(normalizedQuery) !== -1;

        if (!matchesQuery) {
          item.hidden = true;
          return;
        }

        item.hidden = matched >= state.shown;
        matched += 1;
      });

      /* ===== Views ===== */
      setHidden(viewActive, !(isActive && matched > 0));
      setHidden(viewCompleted, !(!isActive && matched > 0));

      /* ===== Empty state ===== */
      if (emptyText) {
        if (state.q) {
          emptyText.textContent = 'За вашим запитом заявок не знайдено.';
        } else {
          emptyText.textContent = isActive ? 'Наразі немає активних заявок.' : 'Поки що немає завершених проєктів.';
        }
      }

      setHidden(emptyElement, matched > 0);

      /* ===== Load more ===== */
      setHidden(loadWrap, matched <= state.shown);

      /* ===== Subtitle ===== */
      if (subtitle) {
        subtitle.textContent = SUBTITLES[state.status];
      }

      /* ===== Tabs ===== */
      updateTabs();

      /* ===== Sort label ===== */
      if (sortLabel) {
        sortLabel.textContent = SORT_LABELS[state.sort];
      }

      /* ===== URL ===== */
      updateUrl();

      /* ===== Reveal ===== */
      if (revealed) {
        ensureRevealed();
      }
    }

    /* ====== Animated status switch ======= */
    function fadeApply() {
      wrap.style.opacity = '0';

      if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.transform = 'translateY(6px)';
      }

      setTimeout(function () {
        apply();
        staggerReveal();

        wrap.style.opacity = '1';

        if (subtitle) {
          subtitle.style.opacity = '1';
          subtitle.style.transform = 'none';
        }
      }, 170);
    }

    /* ====== Status tabs ========== */
    tabs.forEach(
      function (tab) {
        tab.addEventListener('click', function () {
          var status = tab.getAttribute('data-status-tab');

          if (state.status === status) {
            return;
          }

          state.status = status;
          state.shown = PER_PAGE;
          fadeApply();
        });
      }
    );

    /* ====== Search ===== */
    if (searchInput) {
      searchInput.value = state.q;
      searchInput.addEventListener('input', function () {
        state.q = searchInput.value.trim();
        state.shown = PER_PAGE;
        apply();
      });
    }

    /* ===== Sort menu ===== */
    function closeSort() {
      if (!sortWrap) {
        return;
      }

      sortWrap.classList.remove('sort-open');
      if (sortToggle) {
        sortToggle.setAttribute('aria-expanded', 'false');
      }
    }

    function toggleSort() {
      if (!sortWrap) {
        return;
      }

      var open = sortWrap.classList.toggle('sort-open');
      if (sortToggle) {
        sortToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    }

    if (sortWrap && sortToggle) {
      sortToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        toggleSort();
      });

      Array.prototype.forEach.call(sortWrap.querySelectorAll('[data-sort-opt]'), function (option) {
        option.addEventListener('click', function () {
          state.sort = option.getAttribute('data-sort-opt');
          closeSort();
          apply();
        });
      });

      document.addEventListener('click', function (event) {
        if (!sortWrap.contains(event.target)) {
          closeSort();
        }
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && sortWrap.classList.contains('sort-open')) {
          closeSort();
          sortToggle.focus();
        }
      });
    }

    /* ===== Load more ======== */
    if (loadButton) {
      loadButton.addEventListener('click', function () {
        state.shown += PER_PAGE;
        apply();
        staggerReveal();
      });
    }

    /* ====== Initial render ======= */
    apply();

    function initialReveal() {
      revealed = true;
      staggerReveal();
    }

    initialReveal();

    /*
      Images and fonts may change layout slightly
      after the initial render.
    */
    window.addEventListener('load', function () {
      revealed = true;
      ensureRevealed();
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjects, { once: true });
  } else {
    initProjects();
  }
})();
