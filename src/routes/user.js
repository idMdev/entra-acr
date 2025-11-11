const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');

/**
 * User interface - placeholder for future implementation
 */
router.get('/', async (req, res) => {
    try {
        const authContexts = await storageService.loadAuthContexts();
        
        res.render('user/index', {
            title: 'User Interface',
            authContexts: authContexts
        });
    } catch (error) {
        console.error('Error loading user interface:', error);
        res.render('user/index', {
            title: 'User Interface',
            authContexts: [],
            error: 'Failed to load configuration'
        });
    }
});

module.exports = router;
