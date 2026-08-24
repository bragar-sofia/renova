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
    var pagination = root.querySelector('[data-pagination]');
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
      page: 1
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

    function currentView() {
      return state.status === 'active' ? viewActive : viewCompleted;
    }

    var cancelSwitch = null;

    function switchPage(next) {

      if (cancelSwitch) {
        cancelSwitch();
      }

      var container = currentView();

      if (reduceMotion || !container) {
        state.page = next;
        apply();

        return;
      }

      var startHeight = container.offsetHeight;
      var swapTimer = null;
      var releaseTimer = null;

      cancelSwitch = function () {
        clearTimeout(swapTimer);
        clearTimeout(releaseTimer);
        container.style.minHeight = '';
        wrap.classList.remove('is-swapping');
        cancelSwitch = null;
      };


      wrap.classList.add('is-swapping');

      swapTimer = setTimeout(function () {
        state.page = next;
        apply();


        var endHeight = container.offsetHeight;

        container.style.minHeight = startHeight + 'px';
        void container.offsetHeight;
        container.style.minHeight = endHeight + 'px';

        wrap.classList.remove('is-swapping');

        releaseTimer = setTimeout(function () {
          container.style.minHeight = '';
          cancelSwitch = null;
        }, 560);
      }, 200);
    }

    /* ===== Pagination ===== */
    function pageWindow(current, total) {
      var list = [];
      var index;

      if (total <= 7) {
        for (index = 1; index <= total; index += 1) {
          list.push(index);
        }

        return list;
      }

      var from = Math.max(2, current - 1);
      var to = Math.min(total - 1, current + 1);

      list.push(1);

      if (from > 2) {
        list.push('gap');
      }

      for (index = from; index <= to; index += 1) {
        list.push(index);
      }

      if (to < total - 1) {
        list.push('gap');
      }

      list.push(total);

      return list;
    }

    function renderPagination(total) {
      if (!pagination) {
        return;
      }

      setHidden(pagination, total <= 1);

      if (total <= 1) {
        pagination.innerHTML = '';

        return;
      }

      var html = '<button type="button" class="pagination-arrow" data-page="' + (state.page - 1) + '"'
        + (state.page === 1 ? ' disabled' : '') + ' aria-label="Попередня сторінка">‹</button>';

      pageWindow(state.page, total).forEach(function (entry) {
        if (entry === 'gap') {
          html += '<span class="pagination-gap" aria-hidden="true">…</span>';

          return;
        }

        html += '<button type="button" class="pagination-page' + (entry === state.page ? ' is-active' : '')
          + '" data-page="' + entry + '"' + (entry === state.page ? ' aria-current="page"' : '') + '>' + entry + '</button>';
      });

      html += '<button type="button" class="pagination-arrow" data-page="' + (state.page + 1) + '"'
        + (state.page === total ? ' disabled' : '') + ' aria-label="Наступна сторінка">›</button>';

      pagination.innerHTML = html;
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

      items.forEach(function (item) {
        if (item.getAttribute('data-status') !== state.status) {
          item.hidden = true;
          item.classList.remove('reveal-in');
        }
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

      var matchedItems = current.filter(function (item) {
        var searchText = item.getAttribute('data-search') || '';

        return !normalizedQuery || searchText.indexOf(normalizedQuery) !== -1;
      });

      var matched = matchedItems.length;
      var pageCount = Math.max(1, Math.ceil(matched / PER_PAGE));

      if (state.page > pageCount) {
        state.page = pageCount;
      }

      current.forEach(function (item) {
        item.hidden = true;
      });

      matchedItems
        .slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE)
        .forEach(function (item) {
          item.hidden = false;
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

      /* ===== Pagination ===== */
      renderPagination(pageCount);

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
      wrap.classList.add('is-swapping');

      if (subtitle) {
        subtitle.classList.add('is-swapping');
      }

      setTimeout(function () {
        apply();
        staggerReveal();

        wrap.classList.remove('is-swapping');

        if (subtitle) {
          subtitle.classList.remove('is-swapping');
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
          state.page = 1;
          fadeApply();
        });
      }
    );

    /* ====== Search ===== */
    if (searchInput) {
      searchInput.value = state.q;
      searchInput.addEventListener('input', function () {
        state.q = searchInput.value.trim();
        state.page = 1;
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
    if (pagination) {
      pagination.addEventListener('click', function (event) {
        var button = event.target.closest('[data-page]');
        if (!button || button.disabled) {
          return;
        }

        var next = parseInt(button.getAttribute('data-page'), 10);
        if (!next || next === state.page) {
          return;
        }

        scrollToListTop();
        switchPage(next);
      });
    }

    function scrollToListTop() {
      var anchor = currentView();
      if (!anchor) {
        return;
      }

      var offset = anchor.getBoundingClientRect().top;


      if (offset >= 0) {
        return;
      }

      var top = offset + window.scrollY - 120;

      window.scrollTo({
        top: top < 0 ? 0 : top,
        behavior: reduceMotion ? 'auto' : 'smooth'
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
