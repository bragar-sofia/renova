// api/controllers/HomeController.js

const {labels: PROJECT_WORK_TYPE_LABELS, getWorkflow} = require('../../lib/projectWorkflows');
const {findStageInWorkflow} = require('../../lib/utils');

module.exports = {
  index: async function (req, res) {
    try {
      const found = await Project.find({isVisible: true}).sort('lastActivityAt DESC');
      const mapped = found.map((project) => {
        const workflow = getWorkflow(project.workType);
        const currentStage = workflow ? findStageInWorkflow(workflow, project.currentStage) : null;
        const photos = project.photos && typeof project.photos === 'object' ? project.photos : {};
        const before = Array.isArray(photos.before) ? photos.before : [];
        const after = Array.isArray(photos.after) ? photos.after : [];
        const imageMain = (before[0] && before[0].path) || (after[0] && after[0].path) || null;
        const afterPath = after[0] && after[0].path;
        const imageHover = afterPath && afterPath !== imageMain ? afterPath : null;

        return {
          requestNumber: project.requestNumber,
          title: project.title,
          equipment: project.equipment,
          workType: project.workType,
          workTypeLabel: PROJECT_WORK_TYPE_LABELS[project.workType] || project.workType,
          repairType: project.repairType,
          currentStage: project.currentStage,
          statusText: currentStage ? currentStage.label : project.currentStage,
          completed: project.currentStage === 'completed',
          imageMain,
          imageHover
        };
      });

      return res.view('pages/homepage', {
        activePage: 'home',
        activeProjects: mapped.filter((project) => {return !project.completed;}).slice(0, 3),
        completedProjects: mapped.filter((project) => {return project.completed;}).slice(0, 2)
      });
    } catch (error) {
      sails.log.error('HomeController.index error:', error);
      return res.view('pages/homepage', {
        activePage: 'home',
        activeProjects: [],
        completedProjects: []
      });
    }
  }
};
