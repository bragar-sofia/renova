(function () {
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ====== Stages accordion ======== */
  function initStages(root) {
    var details = root.querySelector('[data-project-stages]');
    if (!details) {
      return;
    }

    var summary = details.querySelector('summary');
    var content = details.querySelector('[data-stages-content]');
    if (!summary || !content) {
      return;
    }

    var reduceMotion = prefersReducedMotion();
    var animating = false;

    summary.addEventListener('click', function (event) {
      event.preventDefault();


      if (animating) {
        return;
      }

      /* ===== Reduced motion ===== */
      if (reduceMotion) {
        details.open = !details.open;
        details.classList.toggle('is-expanded', details.open);
        return;
      }

      /* ===== Close ===== */
      if (details.open) {
        animating = true;
        details.classList.remove('is-expanded');

        var done = false;

        function finish() {
          if (done) {
            return;
          }

          done = true;
          content.removeEventListener('transitionend', onTransitionEnd);

          details.open = false;
          animating = false;
        }

        function onTransitionEnd(event) {
          if (event.target === content && event.propertyName === 'grid-template-rows') {
            finish();
          }
        }

        content.addEventListener('transitionend', onTransitionEnd);

        setTimeout(finish, 650);
        return;
      }

      /* ===== Open ===== */
      details.open = true;
      void content.offsetHeight;
      details.classList.add('is-expanded');
    });
  }

  /* ===== Gallery pair data ====== */
  function collectPairs(root) {
    var sources = Array.prototype.slice.call(root.querySelectorAll('[data-zoom]'));
    if (!sources.length) {
      return [];
    }

    var pairMap = {};
    sources.forEach(function (source) {
      var index = parseInt(source.getAttribute('data-pair'), 10);
      var side = source.getAttribute('data-side');

      if (Number.isNaN(index) || (side !== 'before' && side !== 'after')) {
        return;
      }

      if (!pairMap[index]) {
        pairMap[index] = {
          before: null,
          after: null,
          beforeAlt: '',
          afterAlt: ''
        };
      }

      pairMap[index][side] = source.getAttribute('src');
      pairMap[index][side + 'Alt'] = source.getAttribute('alt') || '';
    });

    return Object.keys(pairMap)
      .map(function (key) {
        return parseInt(key, 10);
      })
      .sort(function (a, b) {
        return a - b;
      })
      .map(function (index) {
        return pairMap[index];
      });
  }

  /* ===== Before / after lightbox ====== */
  function initLightbox(root) {
    var lightbox = root.querySelector('[data-project-lightbox]');
    if (!lightbox) {
      return;
    }

    var pairs = collectPairs(root);
    if (!pairs.length) {
      return;
    }

    var stage = lightbox.querySelector('[data-ba-stage]');
    var beforeImage = lightbox.querySelector('[data-ba-before]');
    var afterImage = lightbox.querySelector('[data-ba-after]');
    var closeButton = lightbox.querySelector('[data-lightbox-close]');

    var nav = lightbox.querySelector('[data-ba-nav]');
    var counter = lightbox.querySelector('[data-ba-counter]');
    var previousButton = lightbox.querySelector('[data-ba-prev]');
    var nextButton = lightbox.querySelector('[data-ba-next]');
    var toggleButton = lightbox.querySelector('[data-ba-toggle]');
    var toggleLabel = lightbox.querySelector('[data-ba-toggle-label]');

    if (!stage || !beforeImage || !afterImage || !closeButton || !nav || !counter || !previousButton || !nextButton || !toggleButton || !toggleLabel) {
      return;
    }

    var current = 0;
    var viewSide = 'after';
    var compare = false;
    var hideTimer = null;
    var dragging = false;
    var previousFocus = null;

    /* ===== Divider ====== */
    function setPosition(percent) {
      var value = Math.max(0, Math.min(100, percent));
      stage.style.setProperty('--ba-pos', value + '%');
    }

    /* ===== Render ====== */
    function render() {
      var pair = pairs[current];
      if (!pair) {
        return;
      }

      var hasBoth = !!(pair.before && pair.after);
      var comparing = compare && hasBoth;

      stage.classList.toggle('ba-view', !comparing);

      /* ===== After ===== */
      if (pair.after) {
        afterImage.src = pair.after;
        afterImage.alt = pair.afterAlt || '';
      } else {
        afterImage.removeAttribute('src');
        afterImage.alt = '';
      }

      /* ===== Before ===== */
      if (pair.before) {
        beforeImage.src = pair.before;
        beforeImage.alt = pair.beforeAlt || '';
      } else {
        beforeImage.removeAttribute('src');
        beforeImage.alt = '';
      }

      /* ===== Comparison ===== */
      if (comparing) {
        beforeImage.hidden = false;
        afterImage.hidden = false;
        setPosition(50);
      } else {
        var showBefore = (viewSide === 'before' && pair.before) || !pair.after;
        if (showBefore) {
          beforeImage.hidden = false;
          afterImage.hidden = !pair.after;
          setPosition(100);
        } else {
          afterImage.hidden = false;
          beforeImage.hidden = true;
          setPosition(100);
        }
      }

      /* ===== Controls ===== */
      toggleButton.hidden = !hasBoth;
      toggleLabel.textContent = comparing ? 'Звичайний перегляд' : 'Порівняти До / Після';
      counter.textContent = (current + 1) + ' / ' + pairs.length;
      nav.hidden = pairs.length <= 1;
    }

    /* ====== Open / close ====== */
    function open(index, side) {
      current = index >= 0 && index < pairs.length ? index : 0;
      viewSide = side === 'before' ? 'before' : 'after';
      compare = false;
      render();

      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      previousFocus = document.activeElement;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');

      document.body.classList.add('project-lightbox-open');

      window.requestAnimationFrame(function () {
        lightbox.classList.add('is-visible');
        closeButton.focus();
      });
    }

    function close() {
      if (!lightbox.classList.contains('is-open')) {
        return;
      }

      lightbox.classList.remove('is-visible');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('project-lightbox-open');

      hideTimer = setTimeout(function () {
        lightbox.classList.remove('is-open');

        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      }, 300);
    }

    /* ======== Navigation ======= */
    function go(delta) {
      current = (current + delta + pairs.length) % pairs.length;
      render();
    }

    /* ===== Drag comparison ======= */
    function moveTo(clientX) {
      var rect = stage.getBoundingClientRect();
      if (!rect.width) {
        return;
      }

      setPosition(((clientX - rect.left) / rect.width) * 100);
    }

    function stopDrag() {
      dragging = false;
      stage.classList.remove('ba-dragging');
    }

    stage.addEventListener('pointerdown', function (event) {
      if (stage.classList.contains('ba-view')) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      dragging = true;
      stage.classList.add('ba-dragging');

      try {
        stage.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture is optional.
      }

      moveTo(event.clientX);
    });

    stage.addEventListener('pointermove', function (event) {
      if (!dragging) {
        return;
      }

      moveTo(event.clientX);
    });

    stage.addEventListener('pointerup', stopDrag);
    stage.addEventListener('pointercancel', stopDrag);
    stage.addEventListener('dragstart', function (event) {
      event.preventDefault();
    });

    /* ===== Gallery triggers ======== */
    var sources = root.querySelectorAll('[data-zoom]');
    sources.forEach(function (source) {
      function openSource() {
        var index = parseInt(source.getAttribute('data-pair'), 10) || 0;
        var side = source.getAttribute('data-side');

        open(index, side);
      }

      source.addEventListener('click', openSource);
      source.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }

        event.preventDefault();
        openSource();
      });
    });

    /* ======= Controls ========= */
    closeButton.addEventListener('click', close);
    previousButton.addEventListener('click', function () {
      go(-1);
    });

    nextButton.addEventListener('click', function () {
      go(1);
    });

    toggleButton.addEventListener('click', function () {
      compare = !compare;
      render();
    });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) {
        close();
      }
    });

    /* ===== Keyboard ===== */
    document.addEventListener('keydown', function (event) {
      if (!lightbox.classList.contains('is-open')) {
        return;
      }

      if (event.key === 'Escape') {
        close();
        return;
      }

      if (event.key === 'ArrowLeft') {
        go(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        go(1);
      }
    });
  }

  /* ====== Init ======= */
  function initProject() {
    var root = document.querySelector('[data-project-page]');
    if (!root) {
      return;
    }

    initStages(root);
    initLightbox(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProject, { once: true });
  } else {
    initProject();
  }
})();
