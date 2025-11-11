/**
 * Middleware to check if user is authenticated (admin)
 */
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/admin/signin');
}

/**
 * Middleware to check if admin session has necessary tokens
 */
function hasValidToken(req, res, next) {
    if (req.session && req.session.accessToken) {
        return next();
    }
    res.redirect('/admin/signin');
}

module.exports = {
    isAuthenticated,
    hasValidToken
};
