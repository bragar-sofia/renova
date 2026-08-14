module.exports.routes = {

  'GET /': 'HomeController.index',
  'GET /services': { view: 'pages/services', locals: { activePage: 'services' } },

  'GET /projects': 'ProjectController.index',
  'GET /projects/:requestNumber': 'ProjectController.show',

  'POST /contact': 'ContactsController.sendMessage',

  'GET /admin/projects': 'AdminProjectController.index',
  'GET /admin/projects/export-json': 'AdminProjectController.exportJson',
  'GET /admin/projects/new': 'AdminProjectController.createPage',
  'POST /admin/projects': 'AdminProjectController.create',
  'GET /admin/projects/:id/edit': 'AdminProjectController.edit',
  'POST /admin/projects/:id': 'AdminProjectController.update',
  'POST /admin/projects/:id/advance-stage': 'AdminProjectController.advanceStage',

  'GET /admin/login': 'AdminAuthController.loginPage',
  'POST /admin/login': 'AdminAuthController.login',
  'POST /admin/logout': 'AdminAuthController.logout',
  'GET /admin': '/admin/projects'

};
