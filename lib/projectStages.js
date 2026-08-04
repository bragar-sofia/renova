// lib/projectStages.js

const stages = Object.freeze([
  Object.freeze({
    key: 'request-received',
    label: 'Заявку отримано'
  }),

  Object.freeze({
    key: 'visit-scheduled',
    label: 'Виїзд погоджено'
  }),

  Object.freeze({
    key: 'diagnostics',
    label: 'Діагностика'
  }),

  Object.freeze({
    key: 'technical-solution',
    label: 'Технічне рішення'
  }),

  Object.freeze({
    key: 'offer-approved',
    label: 'Пропозицію погоджено'
  }),

  Object.freeze({
    key: 'repair',
    label: 'Ремонт'
  }),

  Object.freeze({
    key: 'assembly',
    label: 'Складання та налаштування'
  }),

  Object.freeze({
    key: 'testing',
    label: 'Випробування'
  }),

  Object.freeze({
    key: 'completed',
    label: 'Завершено'
  })
]);

const keys = Object.freeze(
  stages.map((stage) => stage.key)
);

const labels = Object.freeze(
  stages.reduce((result, stage) => {
    result[stage.key] = stage.label;
    return result;
  }, {})
);

module.exports = Object.freeze({
  stages,
  keys,
  labels
});
