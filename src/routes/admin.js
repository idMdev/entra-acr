const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const graphService = require('../services/graphService');
const storageService = require('../services/storageService');
const { isAuthenticated } = require('../middleware/auth');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Admin sign-in page
 */
router.get('/signin', (req, res) => {
    res.render('admin/signin', { 
        title: 'Admin Sign In',
        error: req.query.error 
    });
});

/**
 * Initiate admin sign-in flow
 */
router.get('/signin/initiate', authLimiter, async (req, res) => {
    try {
        const state = crypto.randomBytes(16).toString('hex');
        req.session.authState = state;
        
        const authCodeUrl = await authService.getAuthCodeUrl(state);
        res.redirect(authCodeUrl);
    } catch (error) {
        console.error('Error initiating sign-in:', error);
        res.redirect('/admin/signin?error=initiation_failed');
    }
});

/**
 * Handle auth redirect callback
 */
router.get('/redirect', authLimiter, async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;
        
        if (error) {
            console.error('Auth error:', error, error_description);
            return res.redirect('/admin/signin?error=' + encodeURIComponent(error_description || error));
        }
        
        if (!code) {
            return res.redirect('/admin/signin?error=no_code');
        }
        
        // Verify state to prevent CSRF
        if (state !== req.session.authState) {
            return res.redirect('/admin/signin?error=state_mismatch');
        }
        
        // Exchange code for tokens
        const tokenResponse = await authService.acquireTokenByCode(code);
        
        // Store tokens and user info in session
        req.session.isAuthenticated = true;
        req.session.idToken = tokenResponse.idToken;
        req.session.accessToken = tokenResponse.accessToken;
        req.session.account = tokenResponse.account;
        req.session.authState = null; // Clear state after use
        
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error handling redirect:', error);
        res.redirect('/admin/signin?error=token_exchange_failed');
    }
});

/**
 * Admin dashboard - shows authentication contexts
 */
router.get('/dashboard', apiLimiter, isAuthenticated, async (req, res) => {
    try {
        // Get user profile
        const userProfile = await graphService.getUserProfile(req.session.accessToken);
        
        // Get access token for Graph API using client credentials (service-to-service)
        const tokenResponse = await authService.acquireTokenByClientCredentials();
        const graphAccessToken = tokenResponse.accessToken;
        
        // Fetch authentication contexts
        const authContexts = await graphService.getAuthenticationContexts(graphAccessToken);
        
        // Load saved contexts
        const savedContexts = await storageService.loadAuthContexts();
        const savedContextIds = savedContexts.map(ctx => ctx.id);
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: {
                name: userProfile.displayName || userProfile.userPrincipalName,
                email: userProfile.mail || userProfile.userPrincipalName
            },
            authContexts: authContexts,
            savedContextIds: savedContextIds,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: { 
                name: req.session.account?.name || 'Admin',
                email: req.session.account?.username || ''
            },
            authContexts: [],
            savedContextIds: [],
            error: 'Failed to load authentication contexts. Please check your permissions.'
        });
    }
});

/**
 * Save selected authentication contexts
 */
router.post('/contexts/save', apiLimiter, isAuthenticated, async (req, res) => {
    try {
        const { selectedContexts } = req.body;
        
        if (!selectedContexts || !Array.isArray(selectedContexts)) {
            return res.redirect('/admin/dashboard?error=invalid_selection');
        }
        
        // Get access token for Graph API
        const tokenResponse = await authService.acquireTokenByClientCredentials();
        const graphAccessToken = tokenResponse.accessToken;
        
        // Fetch full details for selected contexts
        const contextDetails = await Promise.all(
            selectedContexts.map(async (contextId) => {
                try {
                    return await graphService.getAuthenticationContextById(graphAccessToken, contextId);
                } catch (error) {
                    // Sanitize contextId for logging to prevent format string injection
                    const sanitizedId = String(contextId).replace(/[^a-zA-Z0-9\-_]/g, '');
                    console.error('Error fetching context:', sanitizedId, error.message || error);
                    return null;
                }
            })
        );
        
        // Filter out any null results
        const validContexts = contextDetails.filter(ctx => ctx !== null);
        
        // Save to local storage
        await storageService.saveAuthContexts(validContexts);
        
        res.redirect('/admin/dashboard?success=contexts_saved');
    } catch (error) {
        console.error('Error saving contexts:', error);
        res.redirect('/admin/dashboard?error=save_failed');
    }
});

/**
 * Sign out
 */
router.get('/signout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
