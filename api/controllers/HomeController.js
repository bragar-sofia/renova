// api/controllers/HomeController.js

const STAGE_LABELS = require('../../lib/projectStages').labels;

module.exports = {
  index: async function (req, res) {
    try {
      const found = await Project.find({ isVisible: true }).sort('updatedAt DESC');

      const mapped = found.map(function (p) {
        const photos = p.photos && typeof p.photos === 'object' ? p.photos : {};
        const before = Array.isArray(photos.before) ? photos.before : [];
        const after = Array.isArray(photos.after) ? photos.after : [];
        const imageMain = (before[0] && before[0].path) || (after[0] && after[0].path) || null;
        const afterPath = after[0] && after[0].path;
        const imageHover = (afterPath && afterPath !== imageMain) ? afterPath : null;

        return {
          requestNumber: p.requestNumber,
          title: p.title,
          equipment: p.equipment,
          statusText: STAGE_LABELS[p.currentStage] || '',
          completed: p.currentStage === 'completed',
          imageMain,
          imageHover
        };
      });

      return res.view('pages/homepage', {
        activePage: 'home',
        activeProjects: mapped.filter(function (p) { return !p.completed; }).slice(0, 3),
        completedProjects: mapped.filter(function (p) { return p.completed; }).slice(0, 2)
      });
    } catch (error) {
      sails.log.error('HomeController.index error:', error);
      return res.view('pages/homepage', { activePage: 'home', activeProjects: [], completedProjects: [] });
    }
  }
};
