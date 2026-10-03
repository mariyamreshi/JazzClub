const express = require('express');
const home = require('../controllers/home.controller');
const health = require('../controllers/health.controller');

const router = express.Router();

router.get('/', home.index);
router.get('/api/health', health.server);
router.get('/api/health/db', health.database);

module.exports = router;
