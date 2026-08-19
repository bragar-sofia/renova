(function () {
  function initFooter() {
    var button = document.querySelector('[data-to-top]');
    if (!button) {
      return;
    }

    var ticking = false;

    function update() {
      ticking = false;
      button.classList.toggle('is-visible', window.scrollY > 400);
    }

    function requestUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(update);
    }

    button.addEventListener('click', function () {
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });

    window.addEventListener('scroll', requestUpdate, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter, { once: true });
  } else {
    initFooter();
  }
})();
