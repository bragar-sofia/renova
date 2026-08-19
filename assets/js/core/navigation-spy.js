(function () {
  function initNavigationSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
    if (!links.length) {
      return;
    }

    var linksById = {};
    links.forEach(function (link) {
      var id = link.dataset.spy;
      if (!id) {
        return;
      }

      if (!linksById[id]) {
        linksById[id] = [];
      }

      linksById[id].push(link);
    });

    var sections = Object.keys(linksById)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!sections.length) {
      return;
    }

    var current = null;
    var ticking = false;

    function setActive(id) {
      links.forEach(function (link) {
        link.classList.toggle('is-active', link.dataset.spy === id);
      });
    }

    function updateNavigation() {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var best = null;
      var bestTop = -Infinity;

      sections.forEach(function (section) {
        var top = section.getBoundingClientRect().top;
        if (top <= line && top > bestTop) {
          bestTop = top;
          best = section.id;
        }
      });

      if (best === current) {
        return;
      }

      current = best;
      setActive(best);
    }

    function requestUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateNavigation);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationSpy, { once: true });
  } else {
    initNavigationSpy();
  }
})();
