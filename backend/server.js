const express = require('express');
const db = require('./database/db');
const path = require('path');
const adminRoutes = require('./routes/admin');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/api/images', express.static(path.join(__dirname, 'public/images')));

// Update CORS settings to allow your VM IP
app.use(cors({
    origin: ['http://s21.ierg4210.ie.cuhk.edu.hk', 'http://localhost:3000'],
    credentials: true
}));

// Admin routes
app.use('/api/admin', adminRoutes);

// Get all categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
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

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single product
app.get('/api/products/:pid', (req, res) => {
    db.get('SELECT * FROM products WHERE pid = ?', [req.params.pid], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(row);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 