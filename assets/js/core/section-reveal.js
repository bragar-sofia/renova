(function () {
  function initSectionReveal() {
    if (!document.documentElement.classList.contains('reveal-ready')) {
      return;
    }

    var sections = Array.prototype.filter.call(
      document.querySelectorAll('main section:not(.revealed-instant)'), function (section) {
        return !section.querySelector('section');
      }
    );

    if (!sections.length) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      sections.forEach(function (section) {
        section.classList.add('is-visible');
      });

      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -15% 0px'
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initSectionReveal,
      { once: true }
    );
  } else {
    initSectionReveal();
  }
})();
