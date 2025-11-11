const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const storageService = require('../services/storageService');

// Rate limiting for user interface
const userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * User interface - placeholder for future implementation
 */
router.get('/', userLimiter, async (req, res) => {
    try {
        const authContexts = await storageService.loadAuthContexts();
        
        res.render('user/index', {
            title: 'User Interface',
            authContexts: authContexts,
            error: null
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
