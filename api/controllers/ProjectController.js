const {
  keys: PROJECT_STAGES,
  labels: STAGE_LABELS
} = require('../../lib/projectStages');

/**
 * Видаляє HTML-теги та нормалізує пробіли.
 */
function stripHtml(html) {
  return typeof html === 'string'
    ? html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    : '';
}

/**
 * Нормалізує звичайний текст.
 */
function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * Скорочує текст до заданої довжини.
 */
function truncate(text, max) {
  if (!text) {
    return '';
  }

  return text.length > max
    ? `${text.slice(0, max - 1).trimEnd()}…`
    : text;
}

function pad(number) {
  return number < 10
    ? `0${number}`
    : String(number);
}

/**
 * Формат:
 * 04.08.2026, 15:10
 */
function formatDate(timestamp) {
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
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

/**
 * Формат:
 * 04.08.26
 */
function formatDateShort(timestamp) {
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
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

/**
 * Нормалізує та сортує фотографії за order.
 */
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

/**
 * Повертає нормалізовану структуру фотографій.
 */
function getProjectPhotos(photos) {
  const source =
    photos &&
    typeof photos === 'object' &&
    !Array.isArray(photos)
      ? photos
      : {};

  return {
    before: sortPhotos(source.before),
    after: sortPhotos(source.after)
  };
}

/**
 * Повертає першу фотографію потрібного типу.
 *
 * Для активного проєкту зазвичай показуємо before.
 * Для завершеного проєкту — after.
 */
function firstPhoto(photos, preferredType = 'before') {
  const normalizedPhotos = getProjectPhotos(photos);

  const primary =
    preferredType === 'after'
      ? normalizedPhotos.after
      : normalizedPhotos.before;

  const secondary =
    preferredType === 'after'
      ? normalizedPhotos.before
      : normalizedPhotos.after;

  const photo = primary[0] || secondary[0];

  return photo
    ? photo.path
    : null;
}

module.exports = {
  /**
   * Список публічних проєктів.
   *
   * Завантажуємо всі видимі записи, оскільки
   * перемикання активних і завершених проєктів
   * виконується на клієнті без перезавантаження.
   */
  index: async function (req, res) {
    try {
      const status =
        req.query.status === 'completed'
          ? 'completed'
          : 'active';

      const q = normalizeText(req.query.q);

      const sort =
        req.query.sort === 'old'
          ? 'old'
          : 'new';

      /*
       * Не фільтруємо тут currentStage і пошуковий запит.
       *
       * Сторінка повинна одразу отримати:
       * - активні заявки;
       * - завершені проєкти.
       */
      const found = await Project.find({
        isVisible: true
      });

      const projects = found.map((project) => {
        const photos = getProjectPhotos(
          project.photos
        );

        /*
         * Для завершених карток:
         *
         * before — початкове зображення;
         * after — зображення після ремонту.
         */
        const imageMain =
          photos.before[0]?.path ||
          photos.after[0]?.path ||
          null;

        const afterPath =
          photos.after[0]?.path || null;

        const imageHover =
          afterPath && afterPath !== imageMain
            ? afterPath
            : null;

        const currentStageIndex =
          PROJECT_STAGES.indexOf(project.currentStage);

        const progress =
          currentStageIndex >= 0
            ? Math.round(((currentStageIndex + 1) / PROJECT_STAGES.length) * 100)
            : 0;

        const descriptionText =
          stripHtml(project.description);

        const currentStageNote =
          normalizeText(project.currentStageNote);

        /*
         * Підготовлений текст для клієнтського пошуку.
         *
         * У data-search не передаємо HTML,
         * а лише звичайний нормалізований текст.
         */
        const searchText = [
          project.requestNumber,
          project.title,
          project.equipment,
          project.repairType,
          currentStageNote,
          descriptionText
        ]
          .map(normalizeText)
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('uk-UA');

        return {
          requestNumber:
          project.requestNumber,

          title:
          project.title,

          equipment:
          project.equipment,

          repairType:
          project.repairType,

          excerpt:
            truncate(descriptionText, 120) ||
            project.repairType ||
            '',

          requestText:
            truncate(descriptionText.replace(/^\s*Опис несправності\s*:?\s*/i, ''), 200) ||
            project.repairType ||
            '',

          statusText:
            STAGE_LABELS[project.currentStage] ||
            project.currentStage ||
            '',

          updatedDate:
            formatDateShort(project.lastActivityAt),

          createdDate:
            formatDateShort(project.requestCreatedAt),

          progress,

          imageMain,

          imageHover,

          completed:
            project.currentStage === 'completed',

          /*
           * Використовуємо для пошуку у браузері.
           */
          searchText,

          /*
           * Використовуємо для клієнтського
           * і початкового серверного сортування.
           *
           * Сортуємо за останньою бізнес-активністю:
           * редагуванням даних, переходом етапу,
           * зміною фото тощо.
           */
          sortTimestamp: project.lastActivityAt
        };
      });

      /*
       * Початкове серверне сортування потрібне,
       * щоб сторінка одразу відобразилася правильно
       * ще до виконання клієнтського JavaScript.
       */
      projects.sort((first, second) => {
        return sort === 'old'
          ? first.sortTimestamp - second.sortTimestamp
          : second.sortTimestamp - first.sortTimestamp;
      });

      return res.view('pages/projects', {
        pageTitle: 'Заявки',
        activePage: 'projects',
        status,
        q,
        sort,
        projects
      });
    } catch (error) {
      sails.log.error(
        'ProjectController.index error:',
        error
      );

      return res.serverError(error);
    }
  },

  /**
   * Сторінка окремого проєкту.
   */
  show: async function (req, res) {
    try {
      const project = await Project.findOne({
        requestNumber: req.params.requestNumber,
        isVisible: true
      });

      if (!project) {
        return res.notFound();
      }

      const completed =
        project.currentStage === 'completed';

      const currentStageIndex =
        PROJECT_STAGES.indexOf(
          project.currentStage
        );

      /**
       * Останній запис кожного етапу.
       */
      const stagesByKey = {};

      const projectStages = Array.isArray(project.stages)
        ? project.stages
        : [];

      projectStages.forEach((stage) => {
        if (stage && stage.key) {
          stagesByKey[stage.key] = stage;
        }
      });

      const timeline = PROJECT_STAGES.map(
        (key, index) => {
          const entry = stagesByKey[key];

          const isCurrent =
            key === project.currentStage;

          const reached =
            currentStageIndex >= 0 &&
            index <= currentStageIndex;

          /**
           * Для активного проєкту поточний етап
           * ще не вважається завершеним.
           *
           * Для completed останній етап також завершений.
           */
          const done =
            index < currentStageIndex ||
            (
              completed &&
              index === currentStageIndex
            );

          /**
           * Актуальний коментар поточного етапу
           * зберігається в currentStageNote.
           *
           * stages містить коментар, який був записаний
           * під час переходу на цей етап, і він може бути
           * неактуальним після редагування.
           */
          const note = isCurrent
            ? (
              normalizeText(
                project.currentStageNote
              ) ||
              normalizeText(entry?.note)
            )
            : normalizeText(entry?.note);

          return {
            key,

            label:
              STAGE_LABELS[key] || key,

            reached,

            done,

            note,

            date:
              entry &&
              typeof entry.enteredAt === 'number'
                ? formatDate(entry.enteredAt)
                : '',

            isCurrent,

            isLast:
              index === PROJECT_STAGES.length - 1
          };
        }
      );

      const photos = getProjectPhotos(
        project.photos
      );

      return res.view('pages/project', {
        pageTitle:
          `Заявка №${project.requestNumber}`,

        activePage: 'projects',

        project,

        completed,

        statusLabel:
          STAGE_LABELS[project.currentStage] ||
          project.currentStage ||
          'Активно',

        timeline,

        before: photos.before,

        after: photos.after,

        /**
         * Для завершеного кейсу основним робимо after,
         * для активного — before.
         */
        mainPhoto: firstPhoto(
          project.photos,
          completed ? 'after' : 'before'
        )
      });
    } catch (error) {
      sails.log.error(
        'ProjectController.show error:',
        error
      );

      return res.serverError(error);
    }
  }
};
