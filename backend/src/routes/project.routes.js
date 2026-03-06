const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

router.get('/', projectController.getProjects);
router.get('/:slug', projectController.getProjectBySlug);

module.exports = router;
