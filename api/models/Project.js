// api/models/Project.js

const crypto = require('crypto');
const PROJECT_STAGES = require('../../lib/projectStages');

/**
 * Генерує випадковий шестизначний номер заявки.
 *
 * Перед поверненням номера перевіряємо, чи він уже існує, оскільки в БД не можна поставити unique без required,
 * а генерація відбувається вже після передачі моделі до beforeCreate
 */
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
      type: 'string'
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
     * Поле використовується для зручного редагування
     * коментаря в адміністративній панелі.
     *
     * Під час переходу на наступний етап поточний коментар
     * записується до відповідного елемента в stages.
     *
     * Після переходу сюди записується початковий коментар
     * нового етапу.
     */
    currentStageNote: {
      type: 'string',
      columnType: 'text',
      defaultsTo: ''
    },

    /**
     * Хронологія переходів між етапами.
     *
     * Масив містить усі етапи, на які вже перейшов проєкт,
     * включно з поточним етапом.
     *
     * enteredAt — дата і час переходу на відповідний етап.
     *
     * Окремі startedAt і completedAt не потрібні:
     * дата переходу на наступний етап одночасно означає,
     * що попередній етап було завершено.
     *
     * Формат:
     *
     * [
     *   {
     *     key: 'request-received',
     *     enteredAt: 1785410400000,
     *     note: 'Заявку отримано та передано менеджеру'
     *   },
     *   {
     *     key: 'visit-scheduled',
     *     enteredAt: 1785496800000,
     *     note: 'Виїзд погоджено на 15 серпня'
     *   },
     *   {
     *     key: 'diagnostics',
     *     enteredAt: 1785583200000,
     *     note: 'Проводиться перевірка шпиндельного вузла'
     *   }
     * ]
     *
     * Останній елемент масиву відповідає currentStage.
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
            enteredAt: Date.now(),
            note: valuesToSet.currentStageNote
          }
        ];
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
   * 1. Отримуємо актуальний проєкт.
   * 2. Якщо currentStage === 'completed' — нічого не змінюємо.
   * 3. Визначаємо наступний етап із PROJECT_STAGES.
   * 4. Зберігаємо актуальний коментар поточного етапу
   *    в останньому елементі stages.
   * 5. Додаємо до stages новий елемент із:
   *    - ключем нового етапу;
   *    - датою переходу;
   *    - початковим коментарем.
   * 6. Оновлюємо currentStage і currentStageNote.
   *
   * @param {string|number} projectId ID проєкту
   * @param {string} nextStageNote Початковий коментар нового етапу
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
     * Завершений проєкт більше нікуди не переходить.
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

    const nextStage =
      PROJECT_STAGES[currentStageIndex + 1];

    /*
     * Захист на випадок, якщо поточний етап
     * уже є останнім у переліку.
     */
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

    /*
     * Перед переходом оновлюємо коментар поточного етапу
     * в його записі хронології.
     */
    if (
      lastStage &&
      lastStage.key === project.currentStage
    ) {
      stages[lastStageIndex] = {
        ...lastStage,
        note: currentNote
      };
    } else {
      /*
       * Резервна логіка для старих або пошкоджених записів,
       * де поточного етапу немає в stages.
       */
      stages.push({
        key: project.currentStage,
        enteredAt:
          typeof project.createdAt === 'number'
            ? project.createdAt
            : transitionDate,
        note: currentNote
      });
    }

    /*
     * Додаємо новий етап одразу в момент переходу на нього.
     */
    stages.push({
      key: nextStage,
      enteredAt: transitionDate,
      note: normalizedNextStageNote
    });

    /*
     * Перевірка currentStage у критеріях захищає
     * від двох одночасних переходів.
     */
    const updatedProject = await Project.updateOne({
      id: project.id,
      currentStage: project.currentStage
    }).set({
      currentStage: nextStage,
      currentStageNote: normalizedNextStageNote,
      stages
    });

    if (!updatedProject) {
      throw new Error(
        'Етап проєкту вже було змінено іншим запитом. Оновіть сторінку та повторіть дію.'
      );
    }

    return updatedProject;
  },
};
