const crypto = require('crypto');
const { keys: PROJECT_STAGES } = require('../../lib/projectStages');

// ===== Helpers =====
async function generateUniqueRequestNumber() {
  const Project = sails.models.project;
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const requestNumber = crypto.randomInt(100000, 1000000).toString();

    const existingProject = await Project.findOne({ requestNumber })

    if (!existingProject) {
      return requestNumber;
    }
  }

  throw new Error(
    'Не вдалося згенерувати унікальний номер заявки.'
  );
}

function normalizePhotos(photos) {
  const source =
    photos &&
    typeof photos === 'object' &&
    !Array.isArray(photos)
      ? photos
      : {};

  return {
    before: Array.isArray(source.before)
      ? source.before
      : [],

    after: Array.isArray(source.after)
      ? source.after
      : []
  };
}

function isValidTimestamp(value) {
  return (
    Number.isFinite(value) &&
    value > 0
  );
}

function getRequestCreatedAtFromStages(stages) {
  if (!Array.isArray(stages)) {
    return null;
  }

  const requestEntry = stages.find((stage) => {
    return (
      stage &&
      stage.key === PROJECT_STAGES[0] &&
      isValidTimestamp(stage.enteredAt)
    );
  });

  if (requestEntry) {
    return requestEntry.enteredAt;
  }

  const firstEntry = stages.find((stage) => {
    return (
      stage &&
      isValidTimestamp(stage.enteredAt)
    );
  });

  return firstEntry
    ? firstEntry.enteredAt
    : null;
}

function getLastActivityAtFromStages(stages) {
  if (!Array.isArray(stages)) {
    return null;
  }

  for (
    let index = stages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const stage = stages[index];

    if (
      stage &&
      isValidTimestamp(stage.enteredAt)
    ) {
      return stage.enteredAt;
    }
  }

  return null;
}

module.exports = {
  // ===== Attributes =====
  attributes: {
    requestNumber: {
      type: 'string'
    },

    requestCreatedAt: {
      type: 'number'
    },

    lastActivityAt: {
      type: 'number'
    },

    title: {
      type: 'string',
      required: true
    },

    equipment: {
      type: 'string',
      required: true
    },

    repairType: {
      type: 'string',
      required: true
    },

    currentStage: {
      type: 'string',
      isIn: PROJECT_STAGES,
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
    }
  },

  // ===== Lifecycle callbacks =====
  beforeCreate: async function (valuesToSet, proceed) {
    try {
      const now = Date.now();

      if (!valuesToSet.requestNumber) {
        valuesToSet.requestNumber =
          await generateUniqueRequestNumber();
      }

      if (
        !valuesToSet.currentStage ||
        !PROJECT_STAGES.includes(valuesToSet.currentStage)
      ) {
        valuesToSet.currentStage = PROJECT_STAGES[0];
      }

      if (typeof valuesToSet.currentStageNote !== 'string') {
        valuesToSet.currentStageNote = '';
      } else {
        valuesToSet.currentStageNote =
          valuesToSet.currentStageNote.trim();
      }

      if (
        !Array.isArray(valuesToSet.stages) ||
        valuesToSet.stages.length === 0
      ) {
        valuesToSet.stages = [
          {
            key: valuesToSet.currentStage,
            enteredAt: now,
            note: valuesToSet.currentStageNote
          }
        ];
      }

      if (
        !isValidTimestamp(
          valuesToSet.requestCreatedAt
        )
      ) {
        valuesToSet.requestCreatedAt =
          getRequestCreatedAtFromStages(
            valuesToSet.stages
          ) || now;
      }

      if (
        !isValidTimestamp(
          valuesToSet.lastActivityAt
        )
      ) {
        valuesToSet.lastActivityAt =
          getLastActivityAtFromStages(
            valuesToSet.stages
          ) ||
          valuesToSet.requestCreatedAt;
      }

      valuesToSet.photos = normalizePhotos(
        valuesToSet.photos
      );

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  beforeUpdate: function (valuesToSet, proceed) {
    try {
      if (
        Object.prototype.hasOwnProperty.call(
          valuesToSet,
          'currentStage'
        ) &&
        !PROJECT_STAGES.includes(valuesToSet.currentStage)
      ) {
        throw new Error(
          `Невідомий етап проєкту: ${valuesToSet.currentStage}`
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          valuesToSet,
          'stages'
        ) &&
        !Array.isArray(valuesToSet.stages)
      ) {
        throw new Error(
          'Поле stages повинно бути масивом.'
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          valuesToSet,
          'photos'
        )
      ) {
        valuesToSet.photos = normalizePhotos(
          valuesToSet.photos
        );
      }

      if (
        !isValidTimestamp(
          valuesToSet.lastActivityAt
        )
      ) {
        valuesToSet.lastActivityAt = Date.now();
      }

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  // ===== Methods =====
  advanceStage: async function (projectId, nextStageNote = '') {
    if (!projectId) {
      throw new Error(
        'Для переходу на наступний етап необхідно передати ID проєкту.'
      );
    }

    const Project = sails.models.project;

    const project = await Project.findOne({
      id: projectId
    });

    if (!project) {
      throw new Error(
        `Проєкт з ID "${projectId}" не знайдено.`
      );
    }

    if (project.currentStage === 'completed') {
      return project;
    }

    const currentStageIndex = PROJECT_STAGES.indexOf(
      project.currentStage
    );

    if (currentStageIndex === -1) {
      throw new Error(
        `Невідомий поточний етап проєкту: "${project.currentStage}".`
      );
    }

    const nextStage =
      PROJECT_STAGES[currentStageIndex + 1];

    if (!nextStage) {
      return project;
    }

    const transitionDate = Date.now();

    const currentNote =
      typeof project.currentStageNote === 'string'
        ? project.currentStageNote.trim()
        : '';

    const normalizedNextStageNote =
      typeof nextStageNote === 'string'
        ? nextStageNote.trim()
        : '';

    const stages = Array.isArray(project.stages)
      ? project.stages.map(stage => ({ ...stage }))
      : [];

    const lastStageIndex = stages.length - 1;
    const lastStage = stages[lastStageIndex];

    if (
      !lastStage ||
      lastStage.key !== project.currentStage
    ) {
      throw new Error(
        'Хронологія проєкту не відповідає поточному етапу.'
      );
    }

    stages[lastStageIndex] = {
      ...lastStage,
      note: currentNote
    };

    stages.push({
      key: nextStage,
      enteredAt: transitionDate,
      note: normalizedNextStageNote
    });

    const updatedProject = await Project.updateOne({
      id: project.id,
      currentStage: project.currentStage
    }).set({
      currentStage: nextStage,
      currentStageNote: normalizedNextStageNote,
      stages,
      lastActivityAt: transitionDate
    });

    if (!updatedProject) {
      throw new Error(
        'Етап проєкту вже було змінено іншим запитом. Оновіть сторінку та повторіть дію.'
      );
    }

    return updatedProject;
  },
};
