// api/policies/protectAdmin.js

/**
 * Захищає всі controller actions,
 * URL яких починається з /admin.
 *
 * Виняток:
 * /admin/login — сторінка та обробник входу.
 */
module.exports = function protectAdmin(req, res, proceed) {
  const requestPath = typeof req.path === 'string' ? req.path : '';
  const isAdminPath = requestPath === '/admin' || requestPath.startsWith('/admin/');

  /*
   * Звичайні публічні сторінки policy
   * пропускає без додаткових перевірок.
   */
  if (!isAdminPath) {
    return proceed();
  }

  /*
   * Сторінка входу та POST-запит авторизації
   * повинні бути доступними без сесії адміністратора.
   */
  if (requestPath === '/admin/login') {
    return proceed();
  }

  /*
   * Адміністратор уже авторизований.
   */
  if (req.session && req.session.isAdmin === true) {
    return proceed();
  }

  /*
   * Для API/JSON-запитів повертаємо 401,
   * а не HTML-редирект.
   */
  if (req.wantsJSON) {
    return res.status(401).json({
      error: 'ADMIN_AUTH_REQUIRED',
      message: 'Потрібна авторизація адміністратора.'
    });
  }

  /*
   * Після входу повертаємо адміністратора
   * на сторінку, яку він спочатку відкривав.
   *
   * Для POST-запитів не зберігаємо URL,
   * оскільки після входу браузер не зможе
   * безпечно повторити тіло POST-запиту.
   */
  const nextUrl = req.method === 'GET' ? req.originalUrl : '/admin/projects';

  return res.redirect(`/admin/login?next=${encodeURIComponent(nextUrl)}`);
};
