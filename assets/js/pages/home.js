(function () {
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* ========= Hero slogans ============= */
  function initHeroSlogans() {
    var slogans = Array.prototype.slice.call(document.querySelectorAll('[data-hero-slogan]'));
    if (slogans.length <= 1 || prefersReducedMotion()) {
      return;
    }

    var current = 0;

    function nextSlogan() {
      var previous = slogans[current];
      current = (current + 1) % slogans.length;
      var next = slogans[current];

      previous.classList.remove('is-active');
      previous.classList.add('is-leaving');
      previous.setAttribute('aria-hidden', 'true');

      setTimeout(function () {
        next.classList.add('is-active');
        next.setAttribute('aria-hidden', 'false');
      }, 180);

      setTimeout(function () {
        previous.classList.remove('is-leaving');
      }, 700);
    }

    setInterval(nextSlogan, 6500);
  }

  /* ====== Hero benefits entrance ============ */
  function initHeroBenefitsEntrance() {
    var band = document.querySelector('.hero-benefits-band');
    if (!band) {
      return;
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        band.classList.add('is-in');
      });
    });

    /*
      Fallback in case the browser throttles
      requestAnimationFrame during initial load.
    */
    setTimeout(function () {
      band.classList.add('is-in');
    }, 300);
  }

  /* ====== Hero benefit separators. Pixel snapping for crisp vertical lines. ==== */
  function initHeroBenefitSeparators() {
    var separators = document.querySelectorAll('.hero-benefit-sep');
    if (!separators.length) {
      return;
    }

    var ticking = false;
    function snapSeparators() {
      ticking = false;
      var dpr = window.devicePixelRatio || 1;

      separators.forEach(function (separator) {
        separator.style.transform = '';
        separator.style.width = '';
      });

      if (getComputedStyle(separators[0]).display === 'none') {
        return;
      }

      var width = Math.max(1, Math.round(2 * dpr)) / dpr;
      separators.forEach(function (separator) {
        separator.style.width = width + 'px';
      });

      separators.forEach(function (separator) {
        var left = separator.getBoundingClientRect().left * dpr;
        var offset = (Math.round(left) - left) / dpr;
        separator.style.transform = 'translateX(' + offset + 'px)';
      });
    }

    function requestSnap() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(snapSeparators);
    }

    setTimeout(snapSeparators, 1100);
    window.addEventListener('resize', requestSnap);
  }

  /* ======= Init ======== */
  function initHome() {
    initHeroSlogans();
    initHeroBenefitsEntrance();
    initHeroBenefitSeparators();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome, { once: true });
  } else {
    initHome();
  }
})();
