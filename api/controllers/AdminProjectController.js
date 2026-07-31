// api/controllers/AdminProjectController.js

const PROJECT_STAGES = require('../../lib/projectStages');

/**
 * Нормалізує звичайне текстове поле.
 */
function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * Нормалізує boolean, отриманий із HTML-форми.
 *
 * Підтримує:
 * true, "true", "1", "on", 1
 */
function normalizeBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'on'
  );
}

/**
 * Формує список простих помилок форми.
 */
function validateProjectPayload(payload) {
  const errors = [];

  if (!payload.title) {
    errors.push('Вкажіть заголовок проєкту.');
  }

  if (!payload.equipment) {
    errors.push('Вкажіть тип і назву обладнання.');
  }

  if (!payload.repairType) {
    errors.push('Вкажіть вид ремонту.');
  }

  return errors;
}

/**
 * Формує поля, які дозволено редагувати
 * через загальну форму проєкту.
 *
 * Навмисно не приймаємо:
 *
 * - requestNumber — генерується моделлю;
 * - currentStage — змінюється через advanceStage;
 * - stages — формується автоматично;
 * - photos — пізніше матимуть окрему логіку завантаження.
 */
function buildProjectPayload(body = {}) {
  return {
    title: normalizeText(body.title),

    equipment: normalizeText(body.equipment),

    repairType: normalizeText(body.repairType),

    currentStageNote: normalizeText(
      body.currentStageNote
    ),

    /**
     * HTML із CKEditor не обрізаємо через trimHtml
     * або інші перетворення.
     *
     * Оскільки це адмінпанель, зберігаємо сформований HTML.
     */
    description:
      typeof body.description === 'string'
        ? body.description.trim()
        : '',

    isVisible: normalizeBoolean(body.isVisible)
  };
}

module.exports = {
  /**
   * Список усіх проєктів у вигляді таблиці.
   *
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

      const projects = await Project.find()
        .sort('updatedAt DESC')
        .skip((currentPage - 1) * perPage)
        .limit(perPage);

      return res.view('admin/projects/index', {
        pageTitle: 'Проєкти та заявки',
        projects,
        projectStages: PROJECT_STAGES,
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
   * Сторінка створення нового проєкту.
   *
   * GET /admin/projects/new
   */
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
      errors: []
    });
  },

  /**
   * Створює новий проєкт.
   *
   * Номер заявки, перший етап і його дата
   * будуть сформовані в beforeCreate моделі.
   *
   * POST /admin/projects
   */
  create: async function (req, res) {
    const payload = buildProjectPayload(req.body);
    const errors = validateProjectPayload(payload);

    if (errors.length > 0) {
      res.status(400);

      return res.view('admin/projects/create', {
        pageTitle: 'Нова заявка',
        project: payload,
        projectStages: PROJECT_STAGES,
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
        errors: [
          'Не вдалося створити проєкт. Перевірте введені дані.'
        ]
      });
    }
  },

  /**
   * Сторінка редагування проєкту.
   *
   * GET /admin/projects/:id/edit
   */
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

  /**
   * Оновлює загальні дані проєкту.
   *
   * Цей екшен не змінює currentStage та stages.
   * Перехід між етапами пізніше матиме окремий екшен,
   * який викликатиме Project.advanceStage().
   *
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

        return res.view('admin/projects/edit', {
          pageTitle: `Редагування заявки №${project.requestNumber}`,
          project: {
            ...project,
            ...payload
          },
          projectStages: PROJECT_STAGES,
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

  /**
   * Переводить проєкт на наступний етап.
   *
   * Саму логіку переходу, оновлення currentStage
   * та формування stages виконує метод моделі
   * Project.advanceStage().
   *
   * POST /admin/projects/:id/advance-stage
   */
  advanceStage: async function (req, res) {
    const projectId = req.params.id;

    try {
      const project = await Project.findOne({
        id: projectId
      });

      if (!project) {
        return res.notFound();
      }

      /*
       * Додаткова перевірка на рівні контролера.
       *
       * Аналогічна перевірка вже є в методі моделі,
       * але тут ми уникаємо зайвого виклику та повертаємо
       * адміністратора на сторінку проєкту.
       */
      if (project.currentStage === 'completed') {
        return res.redirect(
          `/admin/projects/${project.id}/edit`
        );
      }

      const nextStageNote = normalizeText(
        req.body && req.body.nextStageNote
      );

      await Project.advanceStage(
        project.id,
        nextStageNote
      );

      return res.redirect(
        `/admin/projects/${project.id}/edit?success=stage-advanced`
      );
    } catch (error) {
      sails.log.error(
        'AdminProjectController.advanceStage error:',
        error
      );

      /*
       * Повторно отримуємо актуальний запис, оскільки
       * етап міг бути змінений паралельним запитом.
       */
      const project = await Project.findOne({
        id: projectId
      });

      if (!project) {
        return res.notFound();
      }

      const currentStageIndex =
        PROJECT_STAGES.indexOf(
          project.currentStage
        );

      const nextStage =
        currentStageIndex >= 0
          ? PROJECT_STAGES[
        currentStageIndex + 1
          ] || null
          : null;

      res.status(409);

      return res.view('admin/projects/edit', {
        pageTitle:
          `Редагування заявки №${project.requestNumber}`,

        project,

        projectStages: PROJECT_STAGES,

        currentStageIndex,

        nextStage,

        errors: [
          error.message ||
          'Не вдалося перевести проєкт на наступний етап.'
        ],

        success: ''
      });
    }
  },

  /**
   * Виводить усі проєкти у форматі JSON.
   *
   * GET /admin/projects/export-json
   *
   * За замовчуванням JSON відкривається у браузері.
   *
   * Для завантаження файлу:
   * /admin/projects/export-json?download=1
   */
  exportJson: async function (req, res) {
    try {
      const projects = await Project.find().sort('createdAt ASC');

      const json = JSON.stringify(projects, null, 2);

      res.type('application/json');

      if (req.query.download === '1') {
        const date = new Date()
          .toISOString()
          .slice(0, 10);

        res.set(
          'Content-Disposition',
          `attachment; filename="projects-${date}.json"`
        );
      }

      return res.send(json);
    } catch (error) {
      sails.log.error('AdminProjectController.exportJson error:', error);
      return res.serverError(error);
    }
  }
};
