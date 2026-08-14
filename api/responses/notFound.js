// api/responses/notFound.js

module.exports = function notFound(data) {
  const req = this.req;
  const res = this.res;

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
    return res.status(404).json({
      error: 'Not Found',
      ...(
        data &&
        typeof data === 'object' &&
        !Array.isArray(data)
          ? data
          : {}
      )
    });
  }

  /*
   * Для звичайного браузерного запиту
   * показуємо сторінку 404.
   */
  return res.status(404).view(
    '404',
    {
      pageTitle: 'Сторінку не знайдено',
      pageDescription:
        'Сторінка, яку ви шукаєте, не існує або була переміщена.'
    },
    function (error, html) {
      if (error) {
        sails.log.error(
          'Failed to render 404 view:',
          error
        );

        return res
          .status(404)
          .type('text')
          .send('Сторінку не знайдено');
      }

      return res.send(html);
    }
  );
};
