const bcrypt = require('bcryptjs');

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNextUrl(value) {
  const nextUrl = normalizeText(value);

  if (!nextUrl || !nextUrl.startsWith('/admin') || nextUrl.startsWith('//') || nextUrl === '/admin/login') {
    return '/admin/projects';
  }

  return nextUrl;
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      return resolve();
    }

    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.destroy !== 'function') {
      return resolve();
    }

    req.session.destroy((error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
}

module.exports = {
  loginPage: function (req, res) {
    const nextUrl = normalizeNextUrl(req.query.next);

    if (req.session && req.session.isAdmin === true) {
      return res.redirect(nextUrl);
    }

    return res.view('admin/auth/login', {
      pageTitle: 'Вхід до адмінпанелі',
      password: '',
      nextUrl,
      error: '',
      loggedOut: req.query.loggedOut === '1'
    });
  },

  login: async function (req, res) {
    const password = normalizeText(req.body && req.body.password);
    const nextUrl = normalizeNextUrl(req.body && req.body.next);
    const passwordHash = sails.config.custom.adminPasswordHash;

    if (!passwordHash) {
      sails.log.error('ADMIN_PASSWORD_HASH is not configured.');
      return res.serverError('Авторизація адміністратора не налаштована.');
    }

    if (!password) {
      res.status(400);

      return res.view('admin/auth/login', {
        pageTitle: 'Вхід до адмінпанелі',
        password: '',
        nextUrl,
        error: 'Введіть пароль.',
        loggedOut: false
      });
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, passwordHash);

      if (!isPasswordValid) {
        await new Promise((resolve) => {
          setTimeout(resolve, 350);
        });

        res.status(401);

        return res.view('admin/auth/login', {
          pageTitle: 'Вхід до адмінпанелі',
          password: '',
          nextUrl,
          error: 'Невірний пароль.',
          loggedOut: false
        });
      }

      await regenerateSession(req);
      req.session.isAdmin = true;
      req.session.adminAuthenticatedAt = Date.now();

      return res.redirect(nextUrl);
    } catch (error) {
      sails.log.error('AdminAuthController.login error:', error);
      return res.serverError(error);
    }
  },

  logout: async function (req, res) {
    try {
      await destroySession(req);

      const cookieName = sails.config.session.name || 'sails.sid';

      res.clearCookie(cookieName, {
        path: '/'
      });

      return res.redirect('/admin/login?loggedOut=1');
    } catch (error) {
      sails.log.error('AdminAuthController.logout error:', error);
      return res.serverError(error);
    }
  }
};
