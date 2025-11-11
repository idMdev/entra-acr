const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./config/config');

// Import routes
const adminRoutes = require('./src/routes/admin');
const userRoutes = require('./src/routes/user');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
// Note: CSRF protection is implemented through OAuth state parameter for authentication flows
// and session-based authentication for API endpoints. Additional CSRF tokens are not required
// for this application as all state-changing operations require authentication and use
// session cookies with SameSite protection.
app.use(session({
    secret: config.app.sessionSecret || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'lax', // CSRF protection
        maxAge: 3600000 // 1 hour
    }
}));

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Entra ACR Management' });
});

app.use('/admin', adminRoutes);
app.use('/user', userRoutes);

// Auth redirect route (must be at app level, not under /admin)
app.get('/auth/redirect', (req, res, next) => {
    // Forward to admin redirect handler
    req.url = '/admin/redirect';
    adminRoutes(req, res, next);
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: { status: 404 }
    });
});

app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        message: err.message || 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
const PORT = config.app.port;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin interface: http://localhost:${PORT}/admin/signin`);
    console.log(`User interface: http://localhost:${PORT}/user`);
});

module.exports = app;
