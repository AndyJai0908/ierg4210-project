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
    origin: ['http://s21.ierg4210.ie.cuhk.edu.hk', 'https://s21.ierg4210.ie.cuhk.edu.hk'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Accept']
}));

// Session configuration
app.use(session({
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'your-strong-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        domain: 'ierg4210.ie.cuhk.edu.hk'
    },
    rolling: true
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
        const token = req.csrfToken();
        console.log('Generated CSRF token:', token); // Debug log
        
        res.cookie('XSRF-TOKEN', token, {
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            domain: 'ierg4210.ie.cuhk.edu.hk'
        });
        res.json({ csrfToken: token });
    } catch (error) {
        console.error('Error generating CSRF token:', error);
        res.status(500).json({ 
            error: 'Failed to generate CSRF token',
            details: error.message 
        });
    }
});

// Update CSRF configuration
app.use(csrf({ 
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        domain: 'ierg4210.ie.cuhk.edu.hk'
    }
}));

// Static files
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.error('CSRF error:', {
            path: req.path,
            method: req.method,
            token: req.headers['x-csrf-token'],
            session: req.session
        });
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next(err);
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
