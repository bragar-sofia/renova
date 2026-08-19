(function () {
  function initServices() {
    var nav = document.querySelector('[data-services-nav]');
    if (!nav) {
      return;
    }

    var items = Array.prototype.slice.call(nav.querySelectorAll('[data-services-nav-item]'));
    if (!items.length) {
      return;
    }

    /* ====== Navigation targets ======= */
    var targets = items
      .map(function (item) {
        var targetId = item.getAttribute('data-target');
        return {
          item: item,
          element: targetId ? document.getElementById(targetId) : null
        };
      })
      .filter(function (target) {
        return !!target.element;
      });

    if (!targets.length) {
      return;
    }

    var current = null;
    var scrollTicking = false;

    /* ======= Active section ======== */

    function updateActiveSection() {
      scrollTicking = false;
      var line = window.innerHeight * 0.32;
      var active = null;

      targets.forEach(function (target) {
        if (target.element.getBoundingClientRect().top <= line) {
          active = target.item;
        }
      });

      if (!active) {
        active = targets[0].item;
      }

      if (active === current) {
        return;
      }

      current = active;

      items.forEach(function (item) {
        item.classList.toggle('is-active', item === active);
      });
    }

    function requestActiveUpdate() {
      if (scrollTicking) {
        return;
      }

      scrollTicking = true;
      window.requestAnimationFrame(updateActiveSection);
    }

    /* ========= Navigation geometry ======= */

    var dashes = Array.prototype.slice.call(nav.querySelectorAll('[data-services-nav-dash]'));
    var desktopMedia = window.matchMedia('(min-width: 1280px)');

    function toDevicePixel(px) {
      var dpr = window.devicePixelRatio || 1;
      return (Math.round(px * dpr) / dpr);
    }

    /* ====== Dash pixel snapping ======== */
    function snapDashes() {
      if (!dashes.length) {
        return;
      }

      var dpr = window.devicePixelRatio || 1;

      /*
       Reset calculated values first,
       otherwise previous measurements can
       influence the next pass.
      */
      dashes.forEach(function (dash) {
        dash.style.transform = 'none';
        dash.style.height = toDevicePixel(dash.closest('.svc-nav-section') ? 3 : 2) + 'px';
      });

      dashes.forEach(function (dash) {
        var top = dash.getBoundingClientRect().top;
        var snappedTop = Math.round(top * dpr) / dpr;
        var offset = snappedTop - top;

        dash.style.transform = offset ? 'translateY(' + offset + 'px)' : 'none';
      });
    }

    /* ======= Desktop nav centering ====== */
    function resetNavigationGeometry() {
      nav.style.transform = '';
      nav.style.top = '';

      dashes.forEach(function (dash) {
        dash.style.transform = '';
        dash.style.height = '';
      });
    }

    function updateNavigationGeometry() {
      if (!desktopMedia.matches) {
        resetNavigationGeometry();
        return;
      }

      nav.style.transform = 'none';
      nav.style.top = Math.round((window.innerHeight - nav.offsetHeight) / 2) + 'px';

      snapDashes();
    }

    /* ====== Resize ====== */

    var resizeTicking = false;

    function handleResize() {
      if (resizeTicking) {
        return;
      }

      resizeTicking = true;
      window.requestAnimationFrame(function () {
        resizeTicking = false;

        updateNavigationGeometry();
        updateActiveSection();
      });
    }

    /* ====== Events ====== */

    window.addEventListener('scroll', requestActiveUpdate, { passive: true });
    window.addEventListener('resize', handleResize);

    /* ====== Initial state ======= */
    updateNavigationGeometry();
    updateActiveSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServices, { once: true });
  } else {
    initServices();
  }
})();
