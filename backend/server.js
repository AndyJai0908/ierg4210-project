const express = require('express');
const { db, getProduct, getAllProducts, getAllCategories } = require('./database/db');
const path = require('path');
const adminRoutes = require('./routes/admin');
const cors = require('cors');
const session = require('express-session');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const paypalRoutes = require('./routes/paypal');
const rateLimit = require('express-rate-limit');

const app = express();

const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// More specific rate limiters
const productLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per minute for product-related endpoints
    message: { error: 'Too many product requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
    origin: true, // Allow all origins for testing - we'll restrict this later
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Accept']
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-strong-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to false for testing
        sameSite: 'lax'
    }
}));

// Debug middleware to log session and auth status
app.use((req, res, next) => {
    console.log('Session Debug:', {
        method: req.method,
        path: req.path,
        sessionID: req.sessionID,
        session: req.session,
        userId: req.session?.userId,
        isAdmin: req.session?.isAdmin,
        cookies: req.cookies
    });
    next();
});

// Auth routes should be before CSRF protection
app.use('/api/auth', authRoutes);

// Move CSRF token route before CSRF middleware
app.get('/api/csrf-token', (req, res) => {
    try {
        if (!req.session) {
            throw new Error('Session not initialized');
        }
        
        // Generate token without cookie first
        const token = csrf({ cookie: false });
        
        console.log('Session ID:', req.sessionID);
        console.log('Generated CSRF token:', token);
        
        // Set token in session
        req.session.csrfToken = token;
        
        res.json({ csrfToken: token });
    } catch (error) {
        console.error('CSRF Token Generation Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate CSRF token',
            details: error.message,
            sessionExists: !!req.session
        });
    }
});

// Update CSRF configuration
app.use(csrf({
    cookie: false, // Don't use cookies for CSRF
    sessionKey: 'csrfToken' // Use session instead
}));

// Static files
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// CSRF error handler
app.use((err, req, res, next) => {
    console.error('Global error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code
    });
    
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            provided: req.headers['x-csrf-token'],
            expected: req.session?.csrfToken
        });
    }
    
    res.status(500).json({
        error: 'An unexpected error occurred',
        message: err.message
    });
});

// Apply rate limiting to routes (except login)
app.use('/api/admin', apiLimiter);
app.use('/api/products', productLimiter);
app.use('/api/categories', productLimiter);
app.use('/api/paypal', apiLimiter);

// Public routes
app.get('/api/products', async (req, res) => {
    try {
        const rows = await getAllProducts();
        res.json(rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const rows = await getAllCategories();
        res.json(rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get products by category
app.get('/api/categories/:catid/products', (req, res) => {
    db.all('SELECT * FROM products WHERE catid = ?', [req.params.catid], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single product
app.get('/api/products/:pid', async (req, res) => {
    try {
        const product = await getProduct(req.params.pid);
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(product);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin and PayPal routes after CSRF protection
app.use('/api/admin', adminRoutes);
app.use('/api/paypal', paypalRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
