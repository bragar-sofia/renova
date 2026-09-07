// lib/projectWorkflows.js

function createStage(key, label) {
  return Object.freeze({
    key,
    label
  });
}

function createStages(...stages) {
  return Object.freeze(stages);
}

function createBranch(key, label, stages) {
  return Object.freeze({
    key,
    label,
    stages
  });
}

const workflows = Object.freeze({
  /**
   * Технічний аудит і діагностика
   */
  'technical-audit': Object.freeze({
    key: 'technical-audit',
    label: 'Технічний аудит і діагностика',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'visit-scheduled',
        'Виїзд погоджено'
      ),

      createStage(
        'diagnostics',
        'Діагностика та вимірювання'
      ),

      createStage(
        'technical-report',
        'Технічний висновок і звіт підготовлено'
      ),

      createStage(
        'completed',
        'Завершено'
      )
    )
  }),

  /**
   * Відновлення обладнання
   *
   * До етапу offer-approved маршрут спільний.
   * Після погодження пропозиції адміністратор обирає:
   *
   * - onsite
   * - workshop
   */
  restoration: Object.freeze({
    key: 'restoration',
    label: 'Відновлення обладнання',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'visit-scheduled',
        'Виїзд погоджено'
      ),

      createStage(
        'diagnostics',
        'Діагностика та дефектація'
      ),

      createStage(
        'technical-solution',
        'Технічне рішення'
      ),

      createStage(
        'offer-approved',
        'Пропозицію погоджено'
      )
    ),

    branch: Object.freeze({
      afterStage: 'offer-approved',

      options: Object.freeze({
        onsite: createBranch(
          'onsite',
          'Роботи на об’єкті Замовника',

          createStages(
            createStage(
              'onsite-repair',
              'Ремонтні роботи'
            ),

            createStage(
              'onsite-testing',
              'Пусконалагодження та випробування'
            ),

            createStage(
              'completed',
              'Завершено'
            )
          )
        ),

        workshop: createBranch(
          'workshop',
          'Роботи на сервісному майданчику',

          createStages(
            createStage(
              'workshop-dismantling-transport',
              'Демонтаж і транспортування'
            ),

            createStage(
              'workshop-repair',
              'Ремонтні роботи'
            ),

            createStage(
              'workshop-testing',
              'Перевірка та проміжні випробування'
            ),

            createStage(
              'workshop-return',
              'Доставка обладнання Замовнику'
            ),

            createStage(
              'workshop-installation-commissioning',
              'Монтаж та пусконалагодження'
            ),

            createStage(
              'workshop-final-testing',
              'Фінальні випробування'
            ),

            createStage(
              'completed',
              'Завершено'
            )
          )
        )
      })
    })
  }),

  /**
   * Технічне обслуговування
   *
   * У межах Project відстежуємо підготовку та запуск
   * програми технічного обслуговування.
   *
   * Після затвердження графіка ППР і початку робіт
   * цей проєкт вважається завершеним.
   */
  'technical-maintenance': Object.freeze({
    key: 'technical-maintenance',
    label: 'Технічне обслуговування',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'visit-scheduled',
        'Виїзд погоджено'
      ),

      createStage(
        'diagnostics',
        'Діагностика технічного стану'
      ),

      createStage(
        'maintenance-plan',
        'Графік ППР та регламенти підготовлено'
      ),

      createStage(
        'completed',
        'Графік ППР затверджено, роботи розпочато'
      )
    )
  }),

  /**
   * Пусконалагоджувальні роботи
   */
  commissioning: Object.freeze({
    key: 'commissioning',
    label: 'Пусконалагоджувальні роботи',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'work-scheduled',
        'Роботи погоджено'
      ),

      createStage(
        'installation-check',
        'Перевірка монтажу та підключення'
      ),

      createStage(
        'setup-and-accuracy',
        'Налагодження систем і перевірка точності'
      ),

      createStage(
        'testing',
        'Випробування обладнання'
      ),

      createStage(
        'completed',
        'Завершено'
      )
    )
  }),

  /**
   * Калібрування і налагодження
   */
  calibration: Object.freeze({
    key: 'calibration',
    label: 'Калібрування та налагодження',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'visit-scheduled',
        'Виїзд погоджено'
      ),

      createStage(
        'diagnostics',
        'Діагностика та вимірювання'
      ),

      createStage(
        'calibration-adjustment',
        'Налагодження та компенсація похибок'
      ),

      createStage(
        'control-testing',
        'Контрольні випробування'
      ),

      createStage(
        'technical-report',
        'Протокол і результати підготовлено'
      ),

      createStage(
        'completed',
        'Завершено'
      )
    )
  }),

  /**
   * Передпродажна підготовка
   */
  'presale-preparation': Object.freeze({
    key: 'presale-preparation',
    label: 'Передпродажна підготовка',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'diagnostics',
        'Комплексна діагностика'
      ),

      createStage(
        'defect-elimination',
        'Усунення виявлених дефектів'
      ),

      createStage(
        'maintenance-adjustment',
        'Обслуговування та налагодження'
      ),

      createStage(
        'testing',
        'Функціональні випробування'
      ),

      createStage(
        'final-preparation',
        'Фінальна підготовка та комплектація'
      ),

      createStage(
        'completed',
        'Завершено'
      )
    )
  }),

  /**
   * Постачання нового обладнання
   */
  'equipment-supply': Object.freeze({
    key: 'equipment-supply',
    label: 'Постачання нового обладнання',

    stages: createStages(
      createStage(
        'request-received',
        'Заявку отримано'
      ),

      createStage(
        'requirements-analysis',
        'Аналіз технічних вимог'
      ),

      createStage(
        'equipment-selection',
        'Підбір обладнання'
      ),

      createStage(
        'commercial-offer',
        'Комерційну пропозицію підготовлено'
      ),

      createStage(
        'delivery',
        'Доставка обладнання'
      ),

      createStage(
        'installation-commissioning',
        'Монтаж та пусконалагодження'
      ),

      createStage(
        'acceptance',
        'Приймально-здавальні випробування'
      ),

      createStage(
        'training',
        'Інструктаж персоналу'
      ),

      createStage(
        'completed',
        'Завершено'
      )
    )
  })
});


const keys = Object.freeze(
  Object.keys(workflows)
);


const labels = Object.freeze(
  keys.reduce((result, key) => {
    result[key] = workflows[key].label;
    return result;
  }, {})
);


function getWorkflow(workType) {
  return workflows[workType] || null;
}


module.exports = Object.freeze({
  workflows,
  keys,
  labels,
  getWorkflow
});
