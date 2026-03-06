// project.routes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authMiddleware = require('../middleware/auth.middleware'); // ✅ missing import

// ✅ Specific routes MUST come before wildcard routes like /:slug
// If /:slug is first, Express will match "custom" and "my-custom" as slugs
// and your custom project endpoints will never be reached.
router.get('/my-custom', authMiddleware, projectController.getMyCustomProjects);
router.post('/custom', authMiddleware, projectController.createCustomProject);
router.delete('/custom/:projectId', authMiddleware, projectController.deleteCustomProject);

router.get('/', projectController.getProjects);
router.get('/:slug', projectController.getProjectBySlug);

module.exports = router;