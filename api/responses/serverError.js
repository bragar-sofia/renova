module.exports = function serverError(error) {
  const req = this.req;
  const res = this.res;

  if (error) {
    sails.log.error(
      'Server error:',
      error
    );
  }

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
