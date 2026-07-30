// api/models/Project.js

const crypto = require('crypto');
const PROJECT_STAGES = require('../../lib/projectStages');

/**
 * Генерує випадковий шестизначний номер заявки.
 *
 * Перед поверненням номера перевіряємо, чи він уже існує.
 * Остаточним захистом від дублювання залишається unique-індекс БД.
 */
async function generateUniqueRequestNumber() {
  const Project = sails.models.project;
  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const requestNumber = crypto
      .randomInt(100000, 1000000)
      .toString();

    const existingProject = await Project
      .findOne({ requestNumber })
      .select(['id']);

    if (!existingProject) {
      return requestNumber;
    }
  }

  throw new Error(
    'Не вдалося згенерувати унікальний номер заявки.'
  );
}

/**
 * Нормалізує структуру фотографій.
 */
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

module.exports = {
  attributes: {
    /**
     * Публічний шестизначний номер заявки.
     *
     * Зберігаємо як string, щоб номер завжди
     * сприймався як ідентифікатор, а не число.
     *
     * Поле генерується автоматично в beforeCreate.
     */
    requestNumber: {
      type: 'string',
      unique: true
    },

    /**
     * Заголовок проєкту.
     *
     * Наприклад:
     * "Капітальний ремонт токарного верстата 16К20".
     *
     * Також може використовуватися як назва
     * запису в адміністративній панелі.
     */
    title: {
      type: 'string',
      required: true
    },

    /**
     * Тип, виробник і модель обладнання.
     *
     * Наприклад:
     * "Токарний верстат 16К20"
     * або
     * "Гідравлічний прес ДЕ2430".
     */
    equipment: {
      type: 'string',
      required: true
    },

    /**
     * Вид ремонту або основний склад робіт.
     *
     * Наприклад:
     * "Капітальний ремонт",
     * "Відновлення шпиндельного вузла",
     * "Модернізація системи ЧПК".
     */
    repairType: {
      type: 'string',
      required: true
    },

    /**
     * Поточний етап проєкту.
     *
     * Це головне поле життєвого циклу проєкту.
     *
     * Якщо currentStage === 'completed',
     * проєкт вважається завершеним і може
     * відображатися в портфоліо.
     */
    currentStage: {
      type: 'string',
      isIn: PROJECT_STAGES,
      defaultsTo: 'request-received'
    },

    /**
     * Коментар до поточного етапу.
     *
     * Наприклад:
     * "Проводиться перевірка шпиндельного вузла".
     *
     * Під час переходу на наступний етап цей коментар
     * переноситься до відповідного запису в stages.
     */
    currentStageNote: {
      type: 'string',
      columnType: 'text',
      defaultsTo: ''
    },

    /**
     * Дата, коли проєкт перейшов на поточний етап.
     *
     * Під час переходу на наступний етап ця дата
     * переноситься до stages як startedAt.
     */
    currentStageStartedAt: {
      type: 'number'
    },

    /**
     * Архів завершених етапів.
     *
     * Тут зберігаються лише вже пройдені етапи.
     * Поточний етап у цей масив не додається,
     * доки не буде виконано перехід на наступний.
     *
     * Формат:
     *
     * [
     *   {
     *     key: 'request-received',
     *     startedAt: 1785410400000,
     *     completedAt: 1785496800000,
     *     note: 'Заявку прийнято менеджером'
     *   },
     *   {
     *     key: 'diagnostics',
     *     startedAt: 1785583200000,
     *     completedAt: 1785756000000,
     *     note: 'Виявлено зношення шпиндельного вузла'
     *   }
     * ]
     */
    stages: {
      type: 'json',
      defaultsTo: []
    },

    /**
     * Фотографії проєкту.
     *
     * before — фотографії до ремонту.
     * after — відповідні фотографії після ремонту.
     *
     * Фото зіставляються за однаковим полем order.
     *
     * Наприклад:
     *
     * before: [
     *   {
     *     order: 1,
     *     path: '/uploads/projects/123456/before-1.webp',
     *     alt: 'Верстат до ремонту',
     *     caption: 'Загальний вигляд'
     *   }
     * ]
     *
     * after: [
     *   {
     *     order: 1,
     *     path: '/uploads/projects/123456/after-1.webp',
     *     alt: 'Верстат після ремонту',
     *     caption: 'Загальний вигляд після відновлення'
     *   }
     * ]
     *
     * Пара з order: 1 може використовуватися
     * як головне порівняння у картці портфоліо.
     */
    photos: {
      type: 'json',
      defaultsTo: {
        before: [],
        after: []
      }
    },

    /**
     * Загальний HTML-опис із CKEditor.
     *
     * Поле може містити:
     *
     * - початковий стан обладнання;
     * - опис несправності;
     * - результати діагностики;
     * - перелік виконаних робіт;
     * - складнощі під час ремонту;
     * - отриманий результат.
     */
    description: {
      type: 'string',
      columnType: 'text',
      defaultsTo: ''
    },

    /**
     * Чи показувати проєкт на сайті.
     *
     * Прапорець застосовується як до поточних заявок,
     * так і до завершених проєктів у портфоліо.
     *
     * false — проєкт залишається в адмінпанелі,
     * але не відображається публічно.
     */
    isVisible: {
      type: 'boolean',
      defaultsTo: true
    }
  },

  /**
   * Під час створення:
   *
   * 1. Генеруємо номер заявки.
   * 2. Встановлюємо початковий етап request-received.
   * 3. Записуємо дату входу в початковий етап.
   * 4. Створюємо порожній архів пройдених етапів.
   * 5. Нормалізуємо структуру фотографій.
   */
  beforeCreate: async function (valuesToSet, proceed) {
    try {
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

      if (!valuesToSet.currentStageStartedAt) {
        valuesToSet.currentStageStartedAt = Date.now();
      }

      if (typeof valuesToSet.currentStageNote !== 'string') {
        valuesToSet.currentStageNote = '';
      }

      if (!Array.isArray(valuesToSet.stages)) {
        valuesToSet.stages = [];
      }

      valuesToSet.photos = normalizePhotos(
        valuesToSet.photos
      );

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  /**
   * beforeUpdate не керує переходами між етапами.
   *
   * Перехід має виконуватися лише через окремий helper
   * або спеціальну action контролера.
   *
   * Це важливо, щоб звичайне редагування title,
   * description або photos випадково не створювало
   * новий запис в історії етапів.
   */
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

      return proceed();
    } catch (error) {
      return proceed(error);
    }
  },

  /**
   * Переводить проєкт на наступний етап.
   *
   * Логіка переходу:
   *
   * 1. Отримуємо актуальний проєкт із бази.
   * 2. Якщо поточний етап completed — нічого не змінюємо.
   * 3. Визначаємо наступний етап із PROJECT_STAGES.
   * 4. Поточний етап переносимо до архіву stages:
   *    - key — назва етапу;
   *    - startedAt — дата початку етапу;
   *    - completedAt — дата завершення етапу;
   *    - note — коментар до етапу.
   * 5. Наступний етап записуємо в currentStage.
   * 6. Встановлюємо нову дату currentStageStartedAt.
   * 7. Очищаємо currentStageNote.
   *
   * @param {string|number} projectId ID проєкту
   * @param {string} nextStageNote Початковий коментар до нового етапу
   *
   * @returns {Promise<Object>} Оновлений проєкт
   */
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

    /*
     * Завершений проєкт більше не може переходити
     * на наступний етап.
     */
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

    const nextStage = PROJECT_STAGES[
    currentStageIndex + 1
      ];

    /*
     * Додатковий захист на випадок, якщо поточний етап
     * є останнім у списку, але має іншу назву.
     */
    if (!nextStage) {
      return project;
    }

    const transitionDate = Date.now();

    const previousStages = Array.isArray(project.stages)
      ? project.stages
      : [];

    const completedStage = {
      key: project.currentStage,
      startedAt:
        project.currentStageStartedAt || transitionDate,
      completedAt: transitionDate,
      note:
        typeof project.currentStageNote === 'string'
          ? project.currentStageNote.trim()
          : ''
    };

    /*
     * У критерії оновлення додатково перевіряємо currentStage.
     *
     * Це захищає від ситуації, коли два запити одночасно
     * намагаються перевести проєкт на наступний етап.
     */
    const updatedProject = await Project.updateOne({
      id: project.id,
      currentStage: project.currentStage
    }).set({
      stages: [
        ...previousStages,
        completedStage
      ],

      currentStage: nextStage,
      currentStageStartedAt: transitionDate,

      /*
       * Можна одразу передати коментар для нового етапу.
       * Якщо його немає — поле очищається.
       */
      currentStageNote:
        typeof nextStageNote === 'string'
          ? nextStageNote.trim()
          : ''
    });

    if (!updatedProject) {
      throw new Error(
        'Етап проєкту вже було змінено іншим запитом. Оновіть сторінку та повторіть дію.'
      );
    }

    return updatedProject;
  },
};
