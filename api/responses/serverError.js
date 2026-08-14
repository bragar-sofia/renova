// api/responses/serverError.js

module.exports = function serverError(error) {
  const req = this.req;
  const res = this.res;

  /*
   * Саму помилку логгуємо на сервері,
   * але не показуємо її користувачу.
   */
  if (error) {
    sails.log.error(
      'Server error:',
      error
    );
  }

  /*
   * Для AJAX / API-запитів повертаємо JSON.
   */
  const wantsJson =
    req.wantsJSON ||
    (
      req.get &&
      (req.get('accept') || '')
        .includes('application/json')
    );

  if (wantsJson) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message:
        'Сталася внутрішня помилка сервера. Спробуйте ще раз пізніше.'
    });
  }

  /*
   * Для звичайного браузерного запиту
   * показуємо сторінку 500.
   */
  return res.status(500).view(
    '500',
    {
      pageTitle: 'Сталася помилка',
      pageDescription:
        'Не вдалося виконати запит. Спробуйте оновити сторінку або поверніться пізніше.'
    },
    function (viewError, html) {
      if (viewError) {
        sails.log.error(
          'Failed to render 500 view:',
          viewError
        );

        return res
          .status(500)
          .type('text')
          .send('Сталася внутрішня помилка сервера');
      }

      return res.send(html);
    }
  );
};
