const crypto = require("crypto");
const {keys: PROJECT_STAGES} = require("./projectStages");

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

function buildProjectPayload(body = {}) {
  return {
    title: normalizeText(body.title),
    equipment: normalizeText(body.equipment),
    repairType: normalizeText(body.repairType),
    currentStageNote: normalizeText(body.currentStageNote),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    isVisible: normalizeBoolean(body.isVisible)
  };
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
    return (stage && stage.key === PROJECT_STAGES[0] && isValidTimestamp(stage.enteredAt));
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
  getLastActivityAtFromStages
}
