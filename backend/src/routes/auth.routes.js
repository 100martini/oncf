const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/42', authController.redirect42);
router.get('/callback', authController.callback);
router.get('/me', authMiddleware, authController.me);
router.post('/sync', authMiddleware, authController.sync);
router.get('/users/search', authMiddleware, authController.searchUsers);

module.exports = router;