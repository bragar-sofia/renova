(function () {
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ======= Manual card toggle ===== */
  function initCardToggles() {
    var toggles = document.querySelectorAll('[data-cp-toggle]');
    if (!toggles.length) {
      return;
    }

    var timers = new WeakMap();
    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        var card = toggle.closest('[data-project-card], .interactive-card');
        if (!card) {
          return;
        }

        var showAfter = !card.classList.contains('is-after');
        card.classList.add('is-switching');
        card.classList.toggle('is-after', showAfter);

        var previousTimer = timers.get(card);
        if (previousTimer) {
          clearTimeout(previousTimer);
        }

        var timer = setTimeout(function () {
          card.classList.remove('is-switching');
          timers.delete(card);
        }, 2050);

        timers.set(card, timer);
        toggle.setAttribute('aria-pressed', showAfter ? 'true' : 'false');
        toggle.setAttribute('aria-label', showAfter ? 'Показати фото до ремонту' : 'Показати фото після ремонту');

        var label = toggle.querySelector('[data-cp-toggle-label]');
        if (label) {
          label.textContent = showAfter ? 'Після' : 'До';
        }
      });
    });
  }

  /* ====== Automatic before / after ========== */
  function initAutoCompare() {
    var elements = document.querySelectorAll('[data-cp-auto]');

    if (!elements.length || prefersReducedMotion()) {
      return;
    }

    elements.forEach(function (element) {
      var active = false;

      function toggle() {
        active = !active;
        element.classList.toggle('cp-play', active);
      }

      setTimeout(function () {
        toggle();

        setInterval(toggle, 4000);
      }, 3000);
    });
  }

  /* ===== Init ========= */
  function initBeforeAfter() {
    initCardToggles();
    initAutoCompare();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBeforeAfter, { once: true });
  } else {
    initBeforeAfter();
  }
})();
