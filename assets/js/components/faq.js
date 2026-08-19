(function () {
  function initFaq() {
    var items = document.querySelectorAll('[data-faq-item]');
    if (!items.length) {
      return;
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    items.forEach(function (details) {
      var summary = details.querySelector('summary');
      var answer = details.querySelector('[data-faq-answer]');
      if (!summary || !answer) {
        return;
      }

      var animating = false;
      summary.addEventListener('click', function (event) {
        event.preventDefault();

        if (animating) {
          return;
        }

        /* ===== Reduced motion ===== */
        if (reduceMotion) {
          details.open = !details.open;
          details.classList.toggle('is-open', details.open);

          return;
        }

        /* ===== Close ===== */
        if (details.open) {
          animating = true;
          details.classList.remove('is-open');
          var done = false;

          function finish() {
            if (done) {
              return;
            }

            done = true;
            answer.removeEventListener('transitionend', onTransitionEnd);
            details.open = false;
            animating = false;
          }

          function onTransitionEnd(event) {
            if (event.target === answer && event.propertyName === 'grid-template-rows') {
              finish();
            }
          }

          answer.addEventListener('transitionend', onTransitionEnd);
          setTimeout(finish, 550);
          return;
        }

        /* ===== Open ===== */
        details.open = true;
        void answer.offsetHeight;
        details.classList.add('is-open');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq, { once: true });
  } else {
    initFaq();
  }
})();
