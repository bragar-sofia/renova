const {keys: PROJECT_WORK_TYPES, getWorkflow} = require('../../lib/projectWorkflows');
const {
  generateUniqueRequestNumber,
  normalizePhotos,
  isValidTimestamp,
  getRequestCreatedAtFromStages,
  getLastActivityAtFromStages,
  isStageInWorkflow,
  isKnownProjectStage,
  getNextStage
} = require('../../lib/utils');

module.exports = {
  // ===== Attributes =====
  attributes: {
    requestNumber: {
      type: 'string'
    },

    requestCreatedAt: {
      type: 'number',
      columnType: 'double precision'
    },

    lastActivityAt: {
      type: 'number',
      columnType: 'double precision'
    },

    title: {
      type: 'string',
      required: true
    },

    equipment: {
      type: 'string',
      required: true
    },

    workType: {
      type: 'string',
      required: true,
      isIn: PROJECT_WORK_TYPES
    },

    repairType: {
      type: 'string',
      required: true
    },

    currentStage: {
      type: 'string',
      defaultsTo: 'request-received'
    },

    currentStageNote: {
      type: 'string',
      columnType: 'text',
      defaultsTo: ''
    },

    stages: {
      type: 'json',
      defaultsTo: []
    },

    photos: {
      type: 'json',
      defaultsTo: {
        before: [],
        after: []
      }
    },

    description: {
      type: 'string',
      columnType: 'text',
      defaultsTo: ''
    },

    isVisible: {
      type: 'boolean',
      defaultsTo: true
    },

    createdAt: {
      type: 'number',
      autoCreatedAt: true,
      columnType: 'double precision'
    },

    updatedAt: {
      type: 'number',
      autoUpdatedAt: true,
      columnType: 'double precision'
    }
  },

  // ===== Lifecycle callbacks =====
  beforeCreate: async function (valuesToSet, proceed) {
    try {
      const now = Date.now();

      const workflow = getWorkflow(valuesToSet.workType);
      if (!workflow) {
        throw new Error(`Невідомий тип робіт: "${valuesToSet.workType}".`);
      }

      const initialStage = workflow.stages[0];
      if (!initialStage) {
        throw new Error(`Для типу робіт "${valuesToSet.workType}" не визначено початковий етап.`);
      }

      if (!valuesToSet.requestNumber) {
        valuesToSet.requestNumber = await generateUniqueRequestNumber();
      }

      if (!valuesToSet.currentStage || !isStageInWorkflow(workflow, valuesToSet.currentStage)) {
        valuesToSet.currentStage = initialStage.key;
      }

      if (typeof valuesToSet.currentStageNote !== 'string') {
        valuesToSet.currentStageNote = '';
      } else {
        valuesToSet.currentStageNote = valuesToSet.currentStageNote.trim();
      }

      if (!Array.isArray(valuesToSet.stages) || valuesToSet.stages.length === 0) {
        valuesToSet.stages = [
          {
            key: valuesToSet.currentStage,
            enteredAt: now,
            note: valuesToSet.currentStageNote
          }
        ];
      }

      if (!isValidTimestamp(valuesToSet.requestCreatedAt)) {
        valuesToSet.requestCreatedAt = getRequestCreatedAtFromStages(valuesToSet.stages) || now;
      }

      if (!isValidTimestamp(valuesToSet.lastActivityAt)) {
        valuesToSet.lastActivityAt = getLastActivityAtFromStages(valuesToSet.stages) || valuesToSet.requestCreatedAt;
      }

      valuesToSet.photos = normalizePhotos(valuesToSet.photos);

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: function (valuesToSet, proceed) {
    try {
      if (Object.prototype.hasOwnProperty.call(valuesToSet, 'currentStage') && !isKnownProjectStage(valuesToSet.currentStage)) {
        throw new Error(`Невідомий етап проєкту: ${valuesToSet.currentStage}`);
      }

      if (Object.prototype.hasOwnProperty.call(valuesToSet, 'stages') && !Array.isArray(valuesToSet.stages)) {
        throw new Error('Поле stages повинно бути масивом.');
      }

      if (Object.prototype.hasOwnProperty.call(valuesToSet, 'photos')) {
        valuesToSet.photos = normalizePhotos(valuesToSet.photos);
      }

      if (!isValidTimestamp(valuesToSet.lastActivityAt)) {
        valuesToSet.lastActivityAt = Date.now();
      }

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  // ===== Methods =====
  /**
   * branchKey is only for restoration:
   * - onsite
   * - workshop
   */
  advanceStage: async function (projectId, nextStageNote = '', branchKey = '') {
    if (!projectId) {
      throw new Error('Для переходу на наступний етап необхідно передати ID проєкту.');
    }

    const project = await Project.findOne({ id: projectId });
    if (!project) {
      throw new Error(`Проєкт з ID "${projectId}" не знайдено.`);
    }

    if (project.currentStage === 'completed') {
      return project;
    }

    const workflow = getWorkflow(project.workType);
    if (!workflow) {
      throw new Error(`Невідомий тип робіт проєкту: "${project.workType}".`);
    }

    if (!isStageInWorkflow(workflow, project.currentStage)) {
      throw new Error(`Етап "${project.currentStage}" не належить типу робіт "${project.workType}".`);
    }

    const nextStage = getNextStage(workflow, project.currentStage, branchKey);
    if (!nextStage) {
      return project;
    }

    const transitionDate = Date.now();
    const currentNote = typeof project.currentStageNote === 'string' ? project.currentStageNote.trim() : '';
    const normalizedNextStageNote = typeof nextStageNote === 'string' ? nextStageNote.trim() : '';
    const stages = Array.isArray(project.stages) ? project.stages.map((stage) => ({ ...stage })) : [];
    const lastStageIndex = stages.length - 1;
    const lastStage = stages[lastStageIndex];

    if (!lastStage || lastStage.key !== project.currentStage) {
      throw new Error('Хронологія проєкту не відповідає поточному етапу.');
    }

    stages[lastStageIndex] = {
      ...lastStage,
      note: currentNote
    };

    stages.push({
      key: nextStage.key,
      enteredAt: transitionDate,
      note: normalizedNextStageNote
    });

    const updatedProject = await Project.updateOne({
      id: project.id,
      currentStage: project.currentStage
    }).set({
      currentStage: nextStage.key,
      currentStageNote: normalizedNextStageNote,
      stages,
      lastActivityAt: transitionDate
    });

    if (!updatedProject) {
      throw new Error('Етап проєкту вже було змінено іншим запитом. Оновіть сторінку та повторіть дію.');
    }

    return updatedProject;
  }
};
