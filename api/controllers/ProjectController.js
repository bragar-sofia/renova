const PROJECT_STAGES = require('../../lib/projectStages');
const STAGE_LABELS = require('../../lib/projectStageLabels');

function stripHtml(html) {
  return typeof html === 'string'
    ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function truncate(text, max) {
  if (!text) { return ''; }
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatDate(ts) {
  if (typeof ts !== 'number') { return ''; }
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateShort(ts) {
  if (typeof ts !== 'number') { return ''; }
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
}

function firstPhoto(photos) {
  const p = photos && typeof photos === 'object' ? photos : {};
  const after = Array.isArray(p.after) ? p.after : [];
  const before = Array.isArray(p.before) ? p.before : [];
  const pick = after[0] || before[0];
  return pick && pick.path ? pick.path : null;
}

module.exports = {
  index: async function (req, res) {
    try {
      const status = req.query.status === 'completed' ? 'completed' : 'active';
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const sort = req.query.sort === 'old' ? 'old' : 'new';

      const found = await Project.find({ isVisible: true })
        .sort(sort === 'old' ? 'createdAt ASC' : 'updatedAt DESC');

      const projects = found.map(function (p) {
        const photos = p.photos && typeof p.photos === 'object' ? p.photos : {};
        const before = Array.isArray(photos.before) ? photos.before : [];
        const after = Array.isArray(photos.after) ? photos.after : [];
        const imageMain = (before[0] && before[0].path) || (after[0] && after[0].path) || null;
        const afterPath = after[0] && after[0].path;
        const imageHover = (afterPath && afterPath !== imageMain) ? afterPath : null;

        const stages = Array.isArray(p.stages) ? p.stages : [];
        const currentEntry = stages.filter(function (s) { return s && s.key === p.currentStage; }).pop();
        const lastEntry = stages[stages.length - 1];
        const stageTs = (currentEntry && typeof currentEntry.enteredAt === 'number') ? currentEntry.enteredAt
          : (lastEntry && typeof lastEntry.enteredAt === 'number') ? lastEntry.enteredAt
          : p.updatedAt;

        return {
          requestNumber: p.requestNumber,
          title: p.title,
          equipment: p.equipment,
          excerpt: truncate(stripHtml(p.description), 120) || p.repairType || '',
          requestText: truncate(stripHtml(p.description), 200) || p.repairType || '',
          statusText: STAGE_LABELS[p.currentStage] || '',
          updatedDate: formatDateShort(stageTs),
          imageMain,
          imageHover,
          completed: p.currentStage === 'completed',
          createdAt: typeof p.createdAt === 'number' ? p.createdAt : 0,
          updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0
        };
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
      const project = await Project.findOne({
        requestNumber: req.params.requestNumber,
        isVisible: true
      });

      if (!project) { return res.notFound(); }

      const completed = project.currentStage === 'completed';

      const stagesByKey = {};
      (Array.isArray(project.stages) ? project.stages : []).forEach(function (s) {
        if (s && s.key) { stagesByKey[s.key] = s; }
      });

      const timeline = PROJECT_STAGES.map(function (key, i) {
        const entry = stagesByKey[key];
        return {
          label: STAGE_LABELS[key] || key,
          done: !!entry,
          note: entry ? (entry.note || '') : '',
          date: entry ? formatDate(entry.enteredAt) : '',
          isCurrent: key === project.currentStage,
          isLast: i === PROJECT_STAGES.length - 1
        };
      });

      const photos = project.photos && typeof project.photos === 'object' ? project.photos : {};

      return res.view('pages/project', {
        pageTitle: `Заявка №${project.requestNumber}`,
        activePage: 'projects',
        project,
        completed,
        statusLabel: completed ? 'Завершено' : 'Активно',
        timeline,
        before: Array.isArray(photos.before) ? photos.before : [],
        after: Array.isArray(photos.after) ? photos.after : [],
        mainPhoto: firstPhoto(project.photos)
      });
    } catch (error) {
      sails.log.error('ProjectController.show error:', error);
      return res.serverError(error);
    }
  }
};
