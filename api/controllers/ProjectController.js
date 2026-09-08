// api/controllers/ProjectController.js

const {
  stripHtml,
  normalizeText,
  truncate,
  formatDate,
  formatDateShort,
  getProjectPhotos,
  firstPhoto,
  getProjectWorkflowViewState
} = require('../../lib/utils');

module.exports = {
  /**
   * GET /projects
   */
  index: async function (req, res) {
    try {
      const status = req.query.status === 'completed' ? 'completed' : 'active';
      const q = normalizeText(req.query.q);
      const sort = req.query.sort === 'old' ? 'old' : 'new';

      const found = await Project.find({ isVisible: true });

      const projects = found.map((project) => {
        const workflowState = getProjectWorkflowViewState(project);
        const photos = getProjectPhotos(project.photos);
        const imageMain = photos.before[0]?.path || photos.after[0]?.path || null;
        const afterPath = photos.after[0]?.path || null;
        const imageHover = afterPath && afterPath !== imageMain ? afterPath : null;
        const descriptionText = stripHtml(project.description);
        const currentStageNote = normalizeText(project.currentStageNote);
        const statusText = workflowState.projectStageLabels[project.currentStage] || project.currentStage || '';
        const hasPendingBranch = Boolean(workflowState.workflow.branch && !workflowState.activeBranch && project.currentStage !== 'completed');
        const progress = !hasPendingBranch && workflowState.currentStageIndex >= 0 && workflowState.projectStages.length > 0
          ? Math.round(((workflowState.currentStageIndex + 1) / workflowState.projectStages.length) * 100)
          : null;
        const workTypeLabel = workflowState.workflow.label;
        const searchText = [
          project.requestNumber,
          project.title,
          project.equipment,
          project.repairType,
          workTypeLabel,
          statusText,
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
          workType: project.workType,
          workTypeLabel,
          repairType: project.repairType,
          currentStage: project.currentStage,
          excerpt: truncate(descriptionText, 120) || project.repairType || '',
          requestText: truncate(descriptionText.replace(/^\s*Опис несправності\s*:?\s*/i, ''), 200) || project.repairType || '',
          statusText,
          updatedDate: formatDateShort(project.lastActivityAt),
          createdDate: formatDateShort(project.requestCreatedAt),
          progress,
          imageMain,
          imageHover,
          completed: project.currentStage === 'completed',
          branchLabel: workflowState.activeBranch ? workflowState.activeBranch.label : '',
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

  /**
   * GET /projects/:requestNumber
   */
  show: async function (req, res) {
    try {
      const project = await Project.findOne({ requestNumber: req.params.requestNumber, isVisible: true });
      if (!project) {
        return res.notFound();
      }

      const completed = project.currentStage === 'completed';
      const workflowState = getProjectWorkflowViewState(project);
      const projectHistory = Array.isArray(project.stages) ? project.stages : [];
      const stagesByKey = {};

      projectHistory.forEach((stage) => {
        if (stage && stage.key) {
          stagesByKey[stage.key] = stage;
        }
      });

      const timeline = workflowState.projectStages.map((stageConfig, index) => {
        const key = stageConfig.key;
        const entry = stagesByKey[key];
        const isCurrent = key === project.currentStage;
        const reached = workflowState.currentStageIndex >= 0 && index <= workflowState.currentStageIndex;
        const done = index < workflowState.currentStageIndex || (completed && index === workflowState.currentStageIndex);
        const note = isCurrent ? (normalizeText(project.currentStageNote) || normalizeText(entry?.note)) : normalizeText(entry?.note);

        return {
          key,
          label: stageConfig.label,
          reached,
          done,
          note,
          date: entry && typeof entry.enteredAt === 'number' ? formatDate(entry.enteredAt) : '',
          isCurrent,
          isLast: index === workflowState.projectStages.length - 1
        };
      });

      const hasPendingBranch = Boolean(workflowState.workflow.branch && !workflowState.activeBranch && !completed);
      const progress = !hasPendingBranch && workflowState.currentStageIndex >= 0 && workflowState.projectStages.length > 0
          ? Math.round(((workflowState.currentStageIndex + 1) / workflowState.projectStages.length) * 100)
          : null;

      const photos = getProjectPhotos(project.photos);

      return res.view('pages/project', {
        pageTitle: `Заявка №${project.requestNumber}`,
        activePage: 'projects',
        project,
        completed,
        workTypeLabel: workflowState.workflow.label,
        statusLabel: workflowState.projectStageLabels[project.currentStage] || project.currentStage || 'Активно',
        progress,
        timeline,
        activeBranch: workflowState.activeBranch,
        branchLabel: workflowState.activeBranch ? workflowState.activeBranch.label : '',
        requiresBranchSelection: workflowState.requiresBranchSelection,
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
