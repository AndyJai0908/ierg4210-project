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

// More specific one
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
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Create session for all visitors
    cookie: {
        httpOnly: true,
        secure: true, 
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12; // Products per page
        const offset = (page - 1) * limit;
        
        // Get total count for pagination info
        const countSql = 'SELECT COUNT(*) as total FROM products';
        const total = await new Promise((resolve, reject) => {
            db.get(countSql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });
        
        // Get paginated products
        const sql = 'SELECT * FROM products LIMIT ? OFFSET ?';
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        res.json({
            products: rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12; // Products per page
        const offset = (page - 1) * limit;
        const catid = req.params.catid;
        
        // Get total count for pagination info
        const countSql = 'SELECT COUNT(*) as total FROM products WHERE catid = ?';
        const total = await new Promise((resolve, reject) => {
            db.get(countSql, [catid], (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });
        
        // Get paginated products
        const sql = 'SELECT * FROM products WHERE catid = ? LIMIT ? OFFSET ?';
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [catid, limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        res.json({
            products: rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
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

// Auth routes with CSRF protection
app.use('/api/auth', csrfProtection, authRoutes);

// Routes that need CSRF protection
app.use('/api/admin', csrfProtection, adminRoutes);
app.use('/api/paypal', csrfProtection, paypalRoutes);

// Static files, make these more explicit
app.use('/images/products', express.static(path.join(__dirname, 'public/images/products')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'public')));

// Add a route to check if images are accessible
app.get('/api/check-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public/images/products', filename);
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        res.json({ exists: true, path: filePath });
    } else {
        res.json({ exists: false, path: filePath });
    }
});

// Add a specific route for product images
app.get('/images/products/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public/images/products', filename);
    
    console.log('Image requested:', filename);
    console.log('Looking for file at:', filePath);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending image:', err);
            res.status(404).send('Image not found');
        }
    });
});

// Add a debug endpoint to check product data
app.get('/api/debug/products', async (req, res) => {
    try {
        const rows = await getAllProducts();
        res.json({
            products: rows.map(p => ({
                pid: p.pid,
                name: p.name,
                image: p.image,
                thumbnail: p.thumbnail
            }))
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

//  This route is to see what is in the database, it is used for debugging
app.get('/api/debug/products-with-images', async (req, res) => {
    try {
        db.all('SELECT pid, name, image, thumbnail FROM products', [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Direct image serving endpoint
app.get('/api/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public/images/products', filename);
    const fs = require('fs');
    
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Image not found');
        }
        
        const image = fs.readFileSync(filePath);
        const mimeType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') 
            ? 'image/jpeg' 
            : filename.endsWith('.png') 
                ? 'image/png' 
                : 'application/octet-stream';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.send(image);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).send('Error serving image');
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

// Apply rate limiting to routes (except login: will add later)
app.use('/api/admin', apiLimiter);
app.use('/api/products', productLimiter);
app.use('/api/categories', productLimiter);
app.use('/api/paypal', apiLimiter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 
