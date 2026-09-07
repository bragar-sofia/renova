const crypto = require('crypto');
const {
  keys: PROJECT_WORK_TYPES,
  labels: PROJECT_WORK_TYPE_LABELS,
  getWorkflow
} = require('./projectWorkflows');

const INITIAL_PROJECT_STAGE = 'request-received';

/** AdminAuthController utils */
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

/** AdminProjectController utils */
function normalizeBoolean(value) {
  const values = Array.isArray(value) ? value : [value];

  return values.some((item) => {
    return (
      item === true ||
      item === 1 ||
      item === '1' ||
      item === 'true' ||
      item === 'on'
    );
  });
}

function validateProjectPayload(payload, options = {}) {
  const errors = [];
  const requireWorkType = options.requireWorkType === true;

  if (!payload.title) {
    errors.push('Вкажіть заголовок проєкту.');
  }

  if (!payload.equipment) {
    errors.push('Вкажіть тип і назву обладнання.');
  }

  if (!payload.repairType) {
    errors.push('Вкажіть вид робіт.');
  }

  if (requireWorkType) {
    if (!payload.workType) {
      errors.push('Оберіть тип робіт.');
    } else if (!PROJECT_WORK_TYPES.includes(payload.workType)) {
      errors.push('Обрано невідомий тип робіт.');
    }
  }

  return errors;
}

function buildProjectPayload(body = {}, options = {}) {
  const includeWorkType = options.includeWorkType === true;

  const payload = {
    title: normalizeText(body.title),
    equipment: normalizeText(body.equipment),
    repairType: normalizeText(body.repairType),
    currentStageNote: normalizeText(body.currentStageNote),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    isVisible: normalizeBoolean(body.isVisible)
  };

  if (includeWorkType) {
    payload.workType = normalizeText(body.workType);
  }

  return payload;
}

/** ContactsController utils */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** ProjectController utils */
function stripHtml(html) {
  return typeof html === 'string'
    ? html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    : '';
}

function truncate(text, max) {
  if (!text) {
    return '';
  }

  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function pad(number) {
  return number < 10 ? `0${number}` : String(number);
}

function formatDate(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join(', ');
}

function formatDateShort(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    pad(date.getDate()),
    pad(date.getMonth() + 1),
    String(date.getFullYear()).slice(-2)
  ].join('.');
}

function sortPhotos(photos) {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .filter((photo) => {
      return (
        photo &&
        typeof photo === 'object' &&
        typeof photo.path === 'string' &&
        photo.path
      );
    })
    .slice()
    .sort((first, second) => {
      const firstOrder = Number(first.order) || 0;
      const secondOrder = Number(second.order) || 0;

      return firstOrder - secondOrder;
    });
}

function getProjectPhotos(photos) {
  const source = photos && typeof photos === 'object' && !Array.isArray(photos) ? photos : {};

  return {
    before: sortPhotos(source.before),
    after: sortPhotos(source.after)
  };
}

function firstPhoto(photos, preferredType = 'before') {
  const normalizedPhotos = getProjectPhotos(photos);

  const primary = preferredType === 'after' ? normalizedPhotos.after : normalizedPhotos.before;
  const secondary = preferredType === 'after' ? normalizedPhotos.before : normalizedPhotos.after;
  const photo = primary[0] || secondary[0];

  return photo ? photo.path : null;
}

/** ProjectModel utils */
async function generateUniqueRequestNumber() {
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const requestNumber = crypto.randomInt(100000, 1000000).toString();
    const existingProject = await Project.findOne({ requestNumber })
    if (!existingProject) {
      return requestNumber;
    }
  }

  throw new Error('Не вдалося згенерувати унікальний номер заявки.');
}

function normalizePhotos(photos) {
  const source = photos && typeof photos === 'object' && !Array.isArray(photos) ? photos : {};

  return {
    before: Array.isArray(source.before) ? source.before : [],
    after: Array.isArray(source.after) ? source.after : []
  };
}

function isValidTimestamp(value) {
  return (Number.isFinite(value) && value > 0);
}

function getRequestCreatedAtFromStages(stages) {
  if (!Array.isArray(stages)) {
    return null;
  }

  const requestEntry = stages.find((stage) => {
    return (stage && stage.key === INITIAL_PROJECT_STAGE && isValidTimestamp(stage.enteredAt));
  });

  if (requestEntry) {
    return requestEntry.enteredAt;
  }

  const firstEntry = stages.find((stage) => {
    return (stage && isValidTimestamp(stage.enteredAt));
  });

  return firstEntry ? firstEntry.enteredAt : null;
}

function getLastActivityAtFromStages(stages) {
  if (!Array.isArray(stages)) {
    return null;
  }

  for (let index = stages.length - 1; index >= 0; index -= 1) {
    const stage = stages[index];
    if (stage && isValidTimestamp(stage.enteredAt)) {
      return stage.enteredAt;
    }
  }

  return null;
}

function isStageInWorkflow(workflow, stageKey) {
  if (!workflow || !stageKey) {
    return false;
  }

  if (Array.isArray(workflow.stages) && workflow.stages.some((stage) => stage.key === stageKey)) {
    return true;
  }

  const branchOptions = workflow.branch && workflow.branch.options;
  if (!branchOptions) {
    return false;
  }

  return Object.values(branchOptions).some((branch) => {
    return (Array.isArray(branch.stages) && branch.stages.some((stage) => stage.key === stageKey));
  });
}

function isKnownProjectStage(stageKey) {
  return PROJECT_WORK_TYPES.some((workType) => {
    const workflow = getWorkflow(workType);
    return isStageInWorkflow(workflow, stageKey);
  });
}

function findBranchByStage(workflow, stageKey) {
  const branchOptions = workflow.branch && workflow.branch.options;
  if (!branchOptions) {
    return null;
  }

  return Object.values(branchOptions).find((branch) => {
    return (Array.isArray(branch.stages) && branch.stages.some((stage) => stage.key === stageKey));
  }) || null;
}

function findProjectBranch(workflow, project) {
  const branchOptions = workflow && workflow.branch && workflow.branch.options;
  if (!branchOptions || !project) {
    return null;
  }

  const branches = Object.values(branchOptions);
  const stageKeys = [];
  if (project.currentStage) {
    stageKeys.push(project.currentStage);
  }

  if (Array.isArray(project.stages)) {
    for (let index = project.stages.length - 1; index >= 0; index -= 1) {
      const stage = project.stages[index];
      if (stage && stage.key) {
        stageKeys.push(stage.key);
      }
    }
  }

  for (const stageKey of stageKeys) {
    const matchingBranches = branches.filter((branch) => {
      return (Array.isArray(branch.stages) && branch.stages.some((stage) => stage.key === stageKey));
    });

    if (matchingBranches.length === 1) {
      return matchingBranches[0];
    }
  }

  return null;
}

function getNextStage(workflow, currentStage, branchKey = '') {
  if (!workflow) {
    throw new Error('Workflow проєкту не знайдено.');
  }

  if (workflow.branch && workflow.branch.afterStage === currentStage) {
    const branch = workflow.branch.options[branchKey];
    if (!branch) {
      throw new Error('Оберіть варіант виконання робіт: на об’єкті Замовника або на сервісному майданчику.');
    }

    return branch.stages[0] || null;
  }

  const currentStageIndex = workflow.stages.findIndex((stage) => {
    return stage.key === currentStage;
  });

  if (currentStageIndex !== -1) {
    return workflow.stages[currentStageIndex + 1] || null;
  }

  const branch = findBranchByStage(workflow, currentStage);
  if (branch) {
    const branchStageIndex = branch.stages.findIndex((stage) => {
      return stage.key === currentStage;
    });

    return branch.stages[branchStageIndex + 1] || null;
  }

  throw new Error(`Етап "${currentStage}" не належить workflow "${workflow.key}".`);
}

function findStageInWorkflow(workflow, stageKey) {
  if (!workflow || !stageKey) {
    return null;
  }

  const commonStage = Array.isArray(workflow.stages) ? workflow.stages.find((stage) => stage.key === stageKey) : null;
  if (commonStage) {
    return commonStage;
  }

  const branchOptions = workflow.branch && workflow.branch.options;
  if (!branchOptions) {
    return null;
  }

  for (const branch of Object.values(branchOptions)) {
    const stage = Array.isArray(branch.stages) ? branch.stages.find((item) => item.key === stageKey) : null;
    if (stage) {
      return stage;
    }
  }

  return null;
}

function buildStageLabels(stages) {
  if (!Array.isArray(stages)) {
    return {};
  }

  return stages.reduce((result, stage) => {
    result[stage.key] = stage.label;
    return result;
  }, {});
}

function getProjectWorkflowViewState(project) {
  const workflow = getWorkflow(project.workType);
  if (!workflow) {
    throw new Error(`Невідомий тип робіт проєкту: "${project.workType}".`);
  }

  let projectStages = Array.isArray(workflow.stages) ? [...workflow.stages] : [];
  let activeBranch = null;

  if (workflow.branch) {
    activeBranch = findProjectBranch(workflow, project);
    if (activeBranch) {
      projectStages = [...projectStages, ...activeBranch.stages];
    }
  }

  const currentStageIndex = projectStages.findIndex((stage) => {
    return stage.key === project.currentStage;
  });

  if (currentStageIndex === -1) {
    throw new Error(`Етап "${project.currentStage}" не належить workflow "${project.workType}".`);
  }

  const requiresBranchSelection = Boolean(workflow.branch && workflow.branch.afterStage === project.currentStage);
  const nextStageObject = requiresBranchSelection ? null : projectStages[currentStageIndex + 1] || null;

  const branchOptions = requiresBranchSelection ? Object.values(workflow.branch.options).map((branch) => ({
      key: branch.key,
      label: branch.label
    })) : [];

  return {
    workflow,
    projectStages,
    projectStageLabels: buildStageLabels(projectStages),
    currentStageIndex,
    nextStage: nextStageObject ? nextStageObject.key : null,
    activeBranch,
    branchOptions,
    requiresBranchSelection
  };
}

function buildEditViewData(project, {errors = [], success = ''} = {}) {
  const workflowState = getProjectWorkflowViewState(project);

  return {
    pageTitle: `Редагування заявки №${project.requestNumber}`,
    project,
    workTypeLabel: PROJECT_WORK_TYPE_LABELS[project.workType] || project.workType,
    workflow: workflowState.workflow,
    projectStages: workflowState.projectStages,
    projectStageLabels: workflowState.projectStageLabels,
    currentStageIndex: workflowState.currentStageIndex,
    nextStage: workflowState.nextStage,
    activeBranch: workflowState.activeBranch,
    branchOptions: workflowState.branchOptions,
    requiresBranchSelection: workflowState.requiresBranchSelection,
    errors,
    success
  };
}

function prepareProjectForAdminList(project) {
  const workflow = getWorkflow(project.workType);
  const currentStage = workflow ? findStageInWorkflow(workflow, project.currentStage) : null;
  let progress = null;

  if (workflow && currentStage) {
    const activeBranch = workflow.branch ? findProjectBranch(workflow, project) : null;
    if (!workflow.branch || activeBranch) {
      const projectStages = activeBranch ? [...workflow.stages, ...activeBranch.stages] : workflow.stages;
      const currentStageIndex = projectStages.findIndex((stage) => {
        return stage.key === project.currentStage;
      });

      if (currentStageIndex >= 0 && projectStages.length > 0) {
        progress = Math.round(
          ((currentStageIndex + 1) / projectStages.length) * 100
        );
      }
    }
  }

  return {
    ...project,
    workTypeLabel: PROJECT_WORK_TYPE_LABELS[project.workType] || project.workType,
    currentStageLabel: currentStage ? currentStage.label : project.currentStage,
    progress
  };
}

module.exports = {
  normalizeText,
  normalizeNextUrl,
  regenerateSession,
  destroySession,
  normalizeBoolean,
  validateProjectPayload,
  buildProjectPayload,
  escapeHtml,
  stripHtml,
  truncate,
  pad,
  formatDate,
  formatDateShort,
  sortPhotos,
  getProjectPhotos,
  firstPhoto,
  generateUniqueRequestNumber,
  normalizePhotos,
  isValidTimestamp,
  getRequestCreatedAtFromStages,
  getLastActivityAtFromStages,
  isStageInWorkflow,
  isKnownProjectStage,
  findBranchByStage,
  findProjectBranch,
  getNextStage,
  findStageInWorkflow,
  buildStageLabels,
  getProjectWorkflowViewState,
  buildEditViewData,
  prepareProjectForAdminList
}
