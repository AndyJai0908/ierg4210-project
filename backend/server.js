const express = require('express');
const { db, getProduct, getAllProducts, getAllCategories } = require('./database/db');
const path = require('path');
const adminRoutes = require('./routes/admin');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const paypalRoutes = require('./routes/paypal');
const rateLimit = require('express-rate-limit');
const csrfProtection = require('./middleware/csrf'); // Use our custom CSRF middleware

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
    saveUninitialized: true, // Changed to true to ensure session is always created
    cookie: {
        httpOnly: true,
        secure: false, // Temporarily set to false for testing
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Debug middleware
app.use((req, res, next) => {
    console.log('Session Debug:', {
        method: req.method,
        path: req.path,
        sessionID: req.sessionID,
        session: req.session,
        cookies: req.cookies
    });
    next();
});

// Public routes (no CSRF protection needed)
app.get('/api/products', async (req, res) => {
    try {
        const rows = await getAllProducts();
        res.json(rows || []);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const rows = await getAllCategories();
        res.json(rows || []);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    try {
        if (!req.session) {
            throw new Error('Session not initialized');
        }
        
        // Generate new CSRF token using our custom middleware
        const csrfToken = res.locals.csrfNonce;
        
        if (!csrfToken) {
            throw new Error('Failed to generate CSRF token');
        }
        
        res.json({ csrfToken });
    } catch (error) {
        console.error('CSRF Token Generation Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate CSRF token',
            details: error.message
        });
    }
});

// Apply CSRF protection to all routes after this point
app.use(csrfProtection);

// Protected routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/paypal', paypalRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
