// api/controllers/AdminAuthController.js

const { normalizeText, normalizeNextUrl, regenerateSession, destroySession } = require('../../lib/utils');
const bcrypt = require('bcryptjs');

module.exports = {
  /** GET /admin/login */
  loginPage: function (req, res) {
    const nextUrl = normalizeNextUrl(req.query.next);

    // if already authorized
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

  /** POST /admin/login */
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
        // timeout to prevent fast brute forcing
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

      // generate new session ID
      await regenerateSession(req);
      req.session.isAdmin = true;
      req.session.adminAuthenticatedAt = Date.now();

      return res.redirect(nextUrl);
    } catch (error) {
      sails.log.error('AdminAuthController.login error:', error);
      return res.serverError(error);
    }
  },

  /** POST /admin/logout */
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
