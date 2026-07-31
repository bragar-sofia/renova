/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  // Тимчасово рендеримо в’ю напряму, в обхід контролера.
  'GET /': { view: 'pages/homepage' },
  'GET /services': { view: 'pages/services' },

  // Проєкти та заявки — адмінпанель
  'GET /admin/projects': 'AdminProjectController.index',
  'GET /admin/projects/export-json': 'AdminProjectController.exportJson',
  'GET /admin/projects/new': 'AdminProjectController.createPage',
  'POST /admin/projects': 'AdminProjectController.create',
  'GET /admin/projects/:id/edit': 'AdminProjectController.edit',
  'POST /admin/projects/:id': 'AdminProjectController.update',
  'POST /admin/projects/:id/advance-stage': 'AdminProjectController.advanceStage',

  // Авторизація адміністратора
  'GET /admin/login': 'AdminAuthController.loginPage',
  'POST /admin/login': 'AdminAuthController.login',
  'POST /admin/logout': 'AdminAuthController.logout',
  'GET /admin': '/admin/projects'


  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/


};
