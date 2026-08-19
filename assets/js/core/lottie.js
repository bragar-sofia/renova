(function () {
  function initLottie() {
    if (!window.lottie) {
      return;
    }

    var elements = document.querySelectorAll('[data-lottie]');
    if (!elements.length) {
      return;
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var states = new WeakMap();
    var observer = null;

    function run(element) {
      var state = states.get(element);
      if (!state || state.started || !state.loaded || !state.visible) {
        return;
      }

      state.started = true;

      if (reduceMotion) {
        state.animation.goToAndStop(Math.max(0, state.animation.totalFrames - 1), true);
        return;
      }

      state.animation.goToAndPlay(0, true);
    }

    if (!reduceMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            var state = states.get(entry.target);
            if (!state) {
              return;
            }

            state.visible = true;
            run(entry.target);
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.25
        }
      );
    }

    elements.forEach(function (element) {
      var animation = window.lottie.loadAnimation({
        container: element,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: element.getAttribute('data-lottie')
      });

      states.set(element, {
        animation: animation,
        loaded: false,
        visible: reduceMotion || !observer,
        started: false
      });

      animation.addEventListener('DOMLoaded', function () {
          var state = states.get(element);
          if (!state) {
            return;
          }

          state.loaded = true;
          run(element);
        }
      );

      if (observer) {
        observer.observe(element);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLottie, {once: true});
  } else {
    initLottie();
  }
})();
