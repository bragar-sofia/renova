(function () {
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
  function initContacts() {
    initCopyLinks();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContacts, { once: true });
  } else {
    initContacts();
  }
})();
