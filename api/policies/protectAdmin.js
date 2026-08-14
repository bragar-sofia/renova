module.exports = function protectAdmin(req, res, proceed) {
  const requestPath = typeof req.path === 'string' ? req.path : '';
  const isAdminPath = requestPath === '/admin' || requestPath.startsWith('/admin/');

  if (!isAdminPath) {
    return proceed();
  }

  if (requestPath === '/admin/login') {
    return proceed();
  }

  if (req.session && req.session.isAdmin === true) {
    return proceed();
  }

  if (req.wantsJSON) {
    return res.status(401).json({
      error: 'ADMIN_AUTH_REQUIRED',
      message: 'Потрібна авторизація адміністратора.'
    });
  }

  const nextUrl = req.method === 'GET' ? req.originalUrl : '/admin/projects';

  return res.redirect(`/admin/login?next=${encodeURIComponent(nextUrl)}`);
};
