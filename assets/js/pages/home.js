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

  /* ======= Copy contact links ========= */
  function initCopyLinks() {
    var links = document.querySelectorAll('[data-copy-link]');
    if (!links.length) {
      return;
    }

    function legacyCopy(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.opacity = '0';

      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
      } catch (error) {
        // Clipboard API fallback failed.
      }

      document.body.removeChild(textarea);
    }

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard
          .writeText(text)
          .catch(function () {
            legacyCopy(text);
          });
      }

      legacyCopy(text);
      return Promise.resolve();
    }

    links.forEach(function (link) {
      var textElement = link.querySelector('[data-copy-text]');
      if (!textElement) {
        return;
      }

      var originalText = textElement.textContent.trim();
      var resetTimer = null;

      link.addEventListener('click', function (event) {
        event.preventDefault();

        copyText(originalText).then(function () {
          textElement.textContent = 'Скопійовано';
          link.classList.add('is-copied');

          if (resetTimer) {
            clearTimeout(resetTimer);
          }

          resetTimer = setTimeout(function () {
            textElement.textContent = originalText;
            link.classList.remove('is-copied');
          }, 1400);
        });
      });
    });
  }

  /* ====== Contact form ======== */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) {
      return;
    }

    var submitButton = form.querySelector('[data-contact-submit]');
    var statusElement = form.querySelector('[data-contact-status]');

    if (!submitButton || !statusElement) {
      return;
    }

    var defaultButtonText = submitButton.textContent.trim();

    function hideStatus() {
      statusElement.hidden = true;
      statusElement.classList.remove('is-success', 'is-error');
    }

    function showStatus(type, message) {
      statusElement.textContent = message;
      statusElement.classList.remove('is-success', 'is-error');
      statusElement.classList.add(type === 'success' ? 'is-success' : 'is-error');
      statusElement.hidden = false;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      submitButton.disabled = true;
      submitButton.textContent = 'Надсилаємо...';

      hideStatus();

      try {
        var formData = new FormData(form);

        var response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams(formData)
        });

        var data = {};

        try {
          data = await response.json();
        } catch (error) {
          // Response body may be empty.
        }

        if (!response.ok) {
          throw new Error(data.error || 'Не вдалося надіслати повідомлення.');
        }

        form.reset();

        showStatus('success', data.message || 'Дякуємо! Ваше повідомлення надіслано.');
      } catch (error) {
        showStatus('error', error.message || 'Не вдалося надіслати повідомлення. Спробуйте ще раз.');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    });
  }

  /* ======= Init ======== */
  function initHome() {
    initHeroSlogans();
    initHeroBenefitsEntrance();
    initHeroBenefitSeparators();
    initCopyLinks();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome, { once: true });
  } else {
    initHome();
  }
})();
