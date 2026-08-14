// api/controllers/ProjectController.js

const { keys: PROJECT_STAGES, labels: STAGE_LABELS } = require('../../lib/projectStages');
const { stripHtml, normalizeText, truncate, pad, formatDate, formatDateShort, sortPhotos, getProjectPhotos, firstPhoto } = require('../../lib/utils');

module.exports = {
  index: async function (req, res) {
    try {
      const status = req.query.status === 'completed' ? 'completed' : 'active';
      const q = normalizeText(req.query.q);
      const sort = req.query.sort === 'old' ? 'old' : 'new';

      const found = await Project.find({ isVisible: true });

      const projects = found.map((project) => {
        const photos = getProjectPhotos(project.photos);
        const imageMain = photos.before[0]?.path || photos.after[0]?.path || null;
        const afterPath = photos.after[0]?.path || null;
        const imageHover = afterPath && afterPath !== imageMain ? afterPath : null;
        const currentStageIndex = PROJECT_STAGES.indexOf(project.currentStage);
        const progress = currentStageIndex >= 0 ? Math.round(((currentStageIndex + 1) / PROJECT_STAGES.length) * 100) : 0;
        const descriptionText = stripHtml(project.description);
        const currentStageNote = normalizeText(project.currentStageNote);
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
          requestNumber: project.requestNumber,
          title: project.title,
          equipment: project.equipment,
          repairType: project.repairType,
          excerpt: truncate(descriptionText, 120) || project.repairType || '',
          requestText: truncate(descriptionText.replace(/^\s*Опис несправності\s*:?\s*/i, ''), 200) || project.repairType || '',
          statusText: STAGE_LABELS[project.currentStage] || project.currentStage || '',
          updatedDate: formatDateShort(project.lastActivityAt),
          createdDate: formatDateShort(project.requestCreatedAt),
          progress,
          imageMain,
          imageHover,
          completed: project.currentStage === 'completed',
          searchText,
          sortTimestamp: project.lastActivityAt
        };
      });

      projects.sort((first, second) => {
        return sort === 'old' ? first.sortTimestamp - second.sortTimestamp : second.sortTimestamp - first.sortTimestamp;
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
      sails.log.error('ProjectController.index error:', error);
      return res.serverError(error);
    }
  },

  show: async function (req, res) {
    try {
      const project = await Project.findOne({ requestNumber: req.params.requestNumber, isVisible: true });
      if (!project) {
        return res.notFound();
      }

      const completed = project.currentStage === 'completed';
      const currentStageIndex = PROJECT_STAGES.indexOf(project.currentStage);
      const stagesByKey = {};

      const projectStages = Array.isArray(project.stages) ? project.stages : [];
      projectStages.forEach((stage) => {
        if (stage && stage.key) {
          stagesByKey[stage.key] = stage;
        }
      });

      const timeline = PROJECT_STAGES.map((key, index) => {
        const entry = stagesByKey[key];
        const isCurrent = key === project.currentStage;
        const reached = currentStageIndex >= 0 && index <= currentStageIndex;
        const done = index < currentStageIndex || (completed && index === currentStageIndex);
        const note = isCurrent ? (normalizeText(project.currentStageNote) || normalizeText(entry?.note)) : normalizeText(entry?.note);

        return {
          key,
          label: STAGE_LABELS[key] || key,
          reached,
          done,
          note,
          date: entry && typeof entry.enteredAt === 'number' ? formatDate(entry.enteredAt) : '',
          isCurrent,
          isLast: index === PROJECT_STAGES.length - 1
        };
      });

      const photos = getProjectPhotos(project.photos);

      return res.view('pages/project', {
        pageTitle: `Заявка №${project.requestNumber}`,
        activePage: 'projects',
        project,
        completed,
        statusLabel: STAGE_LABELS[project.currentStage] || project.currentStage || 'Активно',
        timeline,
        before: photos.before,
        after: photos.after,
        mainPhoto: firstPhoto(project.photos, completed ? 'after' : 'before')
      });
    } catch (error) {
      sails.log.error('ProjectController.show error:', error);
      return res.serverError(error);
    }
  }
};
