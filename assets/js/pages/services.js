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

(function () {
  function initRepairModal() {
    var modal = document.querySelector('[data-repair-modal]');

    if (!modal) {
      return;
    }

    var panels = modal.querySelectorAll('[data-repair-panel]');
    var dialog = modal.querySelector('[data-repair-dialog]');
    var closeButton = modal.querySelector('.svc-modal-close');
    var previousFocus = null;
    var hideTimer = null;

    function lockScroll() {
      var gap = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-gap', gap + 'px');
      document.body.classList.add('svc-modal-open');
    }

    function unlockScroll() {
      document.body.classList.remove('svc-modal-open');
      document.documentElement.style.removeProperty('--scrollbar-gap');
    }

    function open(trigger) {
      var index = trigger.getAttribute('data-repair-open');

      window.clearTimeout(hideTimer);
      previousFocus = trigger;

      Array.prototype.forEach.call(panels, function (panel) {
        panel.hidden = panel.getAttribute('data-repair-panel') !== index;
      });

      dialog.setAttribute('aria-labelledby', 'svc-modal-title-' + index);
      dialog.scrollTop = 0;
      modal.hidden = false;
      lockScroll();

      window.requestAnimationFrame(function () {
        modal.classList.add('is-visible');
        closeButton.focus();
      });
    }

    function close() {
      modal.classList.remove('is-visible');
      unlockScroll();

      hideTimer = window.setTimeout(function () {
        modal.hidden = true;

        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      }, 300);
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-repair-card]'), function (card) {
      var trigger = card.querySelector('[data-repair-open]');

      if (!trigger) {
        return;
      }

      card.addEventListener('click', function () {
        open(trigger);
      });
    });

    Array.prototype.forEach.call(modal.querySelectorAll('[data-repair-close]'), function (node) {
      node.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) {
        close();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRepairModal, { once: true });
  } else {
    initRepairModal();
  }
})();
