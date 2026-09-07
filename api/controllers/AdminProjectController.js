// api/controllers/AdminProjectController.js

const {
  keys: PROJECT_WORK_TYPES,
  labels: PROJECT_WORK_TYPE_LABELS
} = require('../../lib/projectWorkflows');

const {
  normalizeText,
  validateProjectPayload,
  buildProjectPayload,
  buildEditViewData,
  prepareProjectForAdminList
} = require('../../lib/utils');

module.exports = {
  /**
   * GET /admin/projects
   */
  index: async function (req, res) {
    try {
      const requestedPage = Number.parseInt(req.query.page, 10);
      const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const perPage = 20;

      const totalProjects = await Project.count();
      const totalPages = Math.max(Math.ceil(totalProjects / perPage), 1);
      const currentPage = Math.min(page, totalPages);

      const foundProjects = await Project.find()
        .sort('lastActivityAt DESC')
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

      const projects = foundProjects.map(prepareProjectForAdminList);

      return res.view('admin/projects/index', {
        pageTitle: 'Проєкти та заявки',
        projects,
        pagination: {
          page: currentPage,
          perPage,
          totalProjects,
          totalPages
        },
        success: normalizeText(req.query.success)
      });
    } catch (error) {
      sails.log.error('AdminProjectController.index error:', error);
      return res.serverError(error);
    }
  },


  /**
   * GET /admin/projects/new
   */
  createPage: function (req, res) {
    return res.view('admin/projects/create', {
      pageTitle: 'Нова заявка',
      project: {
        title: '',
        equipment: '',
        workType: '',
        repairType: '',
        currentStageNote: '',
        description: '',
        isVisible: true
      },
      projectWorkTypes: PROJECT_WORK_TYPES,
      projectWorkTypeLabels: PROJECT_WORK_TYPE_LABELS,
      errors: []
    });
  },

  /**
   * POST /admin/projects
   */
  create: async function (req, res) {
    const payload = buildProjectPayload(req.body, {includeWorkType: true});
    const errors = validateProjectPayload(payload, {requireWorkType: true});

    if (errors.length > 0) {
      res.status(400);

      return res.view('admin/projects/create', {
        pageTitle: 'Нова заявка',
        project: payload,
        projectWorkTypes: PROJECT_WORK_TYPES,
        projectWorkTypeLabels: PROJECT_WORK_TYPE_LABELS,
        errors
      });
    }

    try {
      const createdProject = await Project.create(payload).fetch();
      return res.redirect(`/admin/projects/${createdProject.id}/edit?success=created`);
    } catch (error) {
      sails.log.error('AdminProjectController.create error:', error);

      res.status(400);
      return res.view('admin/projects/create', {
        pageTitle: 'Нова заявка',
        project: payload,
        projectWorkTypes: PROJECT_WORK_TYPES,
        projectWorkTypeLabels: PROJECT_WORK_TYPE_LABELS,
        errors: [
          'Не вдалося створити проєкт. Перевірте введені дані.'
        ]
      });
    }
  },

  /**
   * GET /admin/projects/:id/edit
   */
  edit: async function (req, res) {
    try {
      const project = await Project.findOne({id: req.params.id});
      if (!project) {
        return res.notFound();
      }

      return res.view('admin/projects/edit', buildEditViewData(project, {success: normalizeText(req.query.success)}));
    } catch (error) {
      sails.log.error('AdminProjectController.edit error:', error);
      return res.serverError(error);
    }
  },

  /**
   * POST /admin/projects/:id
   */
  update: async function (req, res) {
    const payload = buildProjectPayload(req.body);
    const errors = validateProjectPayload(payload);

    try {
      const project = await Project.findOne({id: req.params.id});

      if (!project) {
        return res.notFound();
      }

      if (errors.length > 0) {
        res.status(400);

        const projectForView = {
          ...project,
          ...payload
        };

        return res.view('admin/projects/edit', buildEditViewData(projectForView, {errors, success: ''}));
      }

      const updatedProject = await Project.updateOne({id: project.id}).set(payload);
      return res.redirect(`/admin/projects/${updatedProject.id}/edit?success=updated`);
    } catch (error) {
      sails.log.error('AdminProjectController.update error:', error);
      return res.serverError(error);
    }
  },

  /**
   * POST /admin/projects/:id/advance-stage
   */
  advanceStage: async function (req, res) {
    const projectId = req.params.id;

    try {
      const project = await Project.findOne({id: projectId});
      if (!project) {
        return res.notFound();
      }

      if (project.currentStage === 'completed') {
        return res.redirect(`/admin/projects/${project.id}/edit`);
      }

      const nextStageNote = normalizeText(req.body && req.body.nextStageNote);
      const branchKey = normalizeText(req.body && req.body.branchKey);

      await Project.advanceStage(project.id, nextStageNote, branchKey);
      return res.redirect(`/admin/projects/${project.id}/edit?success=stage-advanced`);
    } catch (error) {
      sails.log.error('AdminProjectController.advanceStage error:', error);

      const project = await Project.findOne({id: projectId});
      if (!project) {
        return res.notFound();
      }

      res.status(409);

      return res.view('admin/projects/edit', buildEditViewData(project, {
          errors: [error.message || 'Не вдалося перевести проєкт на наступний етап.'],
          success: ''
        })
      );
    }
  },

  /**
   * GET /admin/projects/export-json
   *
   * For downloading:
   * /admin/projects/export-json?download=1
   */
  exportJson: async function (req, res) {
    try {
      const projects = await Project.find().sort('requestCreatedAt ASC');

      const json = JSON.stringify(projects, null, 2);

      res.type('application/json');

      if (req.query.download === '1') {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');

        const timestamp = [
          now.getFullYear(),
          pad(now.getMonth() + 1),
          pad(now.getDate())
        ].join('-') + '_' + [
          pad(now.getHours()),
          pad(now.getMinutes()),
          pad(now.getSeconds())
        ].join('-');

        res.set('Content-Disposition', `attachment; filename="projects-${timestamp}.json"`);
      }

      return res.send(json);
    } catch (error) {
      sails.log.error('AdminProjectController.exportJson error:', error);
      return res.serverError(error);
    }
  }
};
