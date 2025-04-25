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
const csrfProtection = require('./middleware/csrf');
const csrf = require('csrf');
const tokens = new csrf();

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
    origin: ['http://localhost:3000', 'http://s21.ierg4210.ie.cuhk.edu.hk', 'https://s21.ierg4210.ie.cuhk.edu.hk'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Accept']
}));

// Session configuration
app.use(session({
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'your-strong-secret-key',
    resave: false,
    saveUninitialized: true, // Create session for all visitors
    cookie: {
        httpOnly: true,
        secure: false, // Set to false for development
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Debug middleware
app.use((req, res, next) => {
    console.log('Session Debug:', {
        method: req.method,
        path: req.path,
        sessionID: req.sessionID,
        session: req.session
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

app.get('/api/categories/:catid/products', async (req, res) => {
    try {
        db.all('SELECT * FROM products WHERE catid = ?', [req.params.catid], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows || []);
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

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

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
    console.log('Checking auth status:', {
        sessionExists: !!req.session,
        userId: req.session?.userId,
        isAdmin: req.session?.isAdmin
    });

    res.json({
        isLoggedIn: !!req.session.userId,
        isAdmin: !!req.session.isAdmin,
        user: req.session.user || null
    });
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    try {
        if (!req.session) {
            return res.status(500).json({ error: 'Session not available' });
        }
        
        // Generate a new secret if it doesn't exist
        if (!req.session.csrfSecret) {
            req.session.csrfSecret = tokens.secretSync();
        }
        
        // Generate token
        const csrfToken = tokens.create(req.session.csrfSecret);
        
        console.log('Generated CSRF token:', {
            sessionID: req.sessionID,
            tokenLength: csrfToken.length
        });
        
        res.json({ csrfToken });
    } catch (error) {
        console.error('CSRF Token Generation Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate CSRF token',
            details: error.message
        });
    }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Routes that need CSRF protection
app.use('/api/admin', csrfProtection, adminRoutes);
app.use('/api/paypal', csrfProtection, paypalRoutes);

// Static files
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/images/products', express.static(path.join(__dirname, 'public/images/products')));

// Add route to debug image paths
app.get('/api/debug/images', (req, res) => {
    const productsPath = path.join(__dirname, 'public/images/products');
    const fs = require('fs');
    
    try {
        // Check if directory exists
        if (!fs.existsSync(productsPath)) {
            return res.json({
                error: 'Products image directory does not exist',
                path: productsPath
            });
        }
        
        // List files in directory
        const files = fs.readdirSync(productsPath);
        
        res.json({
            path: productsPath,
            files: files,
            exists: true
        });
    } catch (error) {
        res.json({
            error: error.message,
            path: productsPath
        });
    }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
