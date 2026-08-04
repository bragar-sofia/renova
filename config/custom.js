/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

require('dotenv').config();

module.exports.custom = {

  /**
   * Bcrypt-хеш пароля адміністратора.
   *
   * У production значення передається
   * через змінну середовища.
   */
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || ''

};
