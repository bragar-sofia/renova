// api/controllers/AdminProjectController.js

const { keys: PROJECT_STAGES, labels: PROJECT_STAGE_LABELS } = require('../../lib/projectStages');
const { normalizeText, normalizeBoolean, validateProjectPayload, buildProjectPayload } = require('../../lib/utils');

module.exports = {
  /** GET /admin/projects */
  index: async function (req, res) {
    try {
      const requestedPage = Number.parseInt(req.query.page, 10);
      const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const perPage = 20;

      const totalProjects = await Project.count();
      const totalPages = Math.max(Math.ceil(totalProjects / perPage), 1);
      const currentPage = Math.min(page, totalPages);

      const projects = await Project.find()
        .sort('lastActivityAt DESC')
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

      return res.view('admin/projects/index', {
        pageTitle: 'Проєкти та заявки',
        projects,
        projectStages: PROJECT_STAGES,
        projectStageLabels: PROJECT_STAGE_LABELS,
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

  /** GET /admin/projects/new */
  createPage: function (req, res) {
    return res.view('admin/projects/create', {
      pageTitle: 'Нова заявка',
      project: {
        title: '',
        equipment: '',
        repairType: '',
        currentStageNote: '',
        description: '',
        isVisible: true
      },
      projectStages: PROJECT_STAGES,
      projectStageLabels: PROJECT_STAGE_LABELS,
      errors: []
    });
  },

  /** POST /admin/projects */
  create: async function (req, res) {
    const payload = buildProjectPayload(req.body);
    const errors = validateProjectPayload(payload);

    if (errors.length > 0) {
      res.status(400);

      return res.view('admin/projects/create', {
        pageTitle: 'Нова заявка',
        project: payload,
        projectStages: PROJECT_STAGES,
        projectStageLabels: PROJECT_STAGE_LABELS,
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
        projectStages: PROJECT_STAGES,
        projectStageLabels: PROJECT_STAGE_LABELS,
        errors: [
          'Не вдалося створити проєкт. Перевірте введені дані.'
        ]
      });
    }
  },

  /** GET /admin/projects/:id/edit */
  edit: async function (req, res) {
    try {
      const project = await Project.findOne({id: req.params.id});
      if (!project) {
        return res.notFound();
      }

      const currentStageIndex = PROJECT_STAGES.indexOf(project.currentStage);
      const nextStage = currentStageIndex >= 0 ? PROJECT_STAGES[currentStageIndex + 1] || null : null;

      return res.view('admin/projects/edit', {
        pageTitle: `Редагування заявки №${project.requestNumber}`,
        project,
        projectStages: PROJECT_STAGES,
        projectStageLabels: PROJECT_STAGE_LABELS,
        currentStageIndex,
        nextStage,
        errors: [],
        success: normalizeText(req.query.success)
      });
    } catch (error) {
      sails.log.error('AdminProjectController.edit error:', error);
      return res.serverError(error);
    }
  },

  /** POST /admin/projects/:id */
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

        return res.view('admin/projects/edit', {
          pageTitle: `Редагування заявки №${project.requestNumber}`,
          project: {
            ...project,
            ...payload
          },
          projectStages: PROJECT_STAGES,
          projectStageLabels: PROJECT_STAGE_LABELS,
          currentStageIndex: PROJECT_STAGES.indexOf(project.currentStage),
          nextStage: PROJECT_STAGES[PROJECT_STAGES.indexOf(project.currentStage) + 1] || null,
          errors,
          success: ''
        });
      }

      const updatedProject = await Project.updateOne({id: project.id}).set(payload);
      return res.redirect(`/admin/projects/${updatedProject.id}/edit?success=updated`);
    } catch (error) {
      sails.log.error('AdminProjectController.update error:', error);
      return res.serverError(error);
    }
  },

  /** POST /admin/projects/:id/advance-stage */
  advanceStage: async function (req, res) {
    const projectId = req.params.id;

    try {
      const project = await Project.findOne({ id: projectId });
      if (!project) {
        return res.notFound();
      }

      if (project.currentStage === 'completed') {
        return res.redirect(`/admin/projects/${project.id}/edit`);
      }

      const nextStageNote = normalizeText(req.body && req.body.nextStageNote);
      await Project.advanceStage(project.id, nextStageNote);

      return res.redirect(`/admin/projects/${project.id}/edit?success=stage-advanced`);
    } catch (error) {
      sails.log.error('AdminProjectController.advanceStage error:', error);

      const project = await Project.findOne({id: projectId});
      if (!project) {
        return res.notFound();
      }

      const currentStageIndex = PROJECT_STAGES.indexOf(project.currentStage);
      const nextStage = currentStageIndex >= 0 ? PROJECT_STAGES[currentStageIndex + 1] || null : null;

      res.status(409);

      return res.view('admin/projects/edit', {
        pageTitle: `Редагування заявки №${project.requestNumber}`,
        project,
        projectStages: PROJECT_STAGES,
        projectStageLabels: PROJECT_STAGE_LABELS,
        currentStageIndex,
        nextStage,
        errors: [error.message || 'Не вдалося перевести проєкт на наступний етап.'],
        success: ''
      });
    }
  },

  /**
   * GET /admin/projects/export-json
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
