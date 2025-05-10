const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { db } = require('../database/db');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const { createOrder, getProduct, updateProduct, addProduct } = require('../database/db');
const paypal = require('../config/paypal');

// Debug middleware for admin routes
router.use((req, res, next) => {
    console.log('Admin route accessed:', {
        path: req.path,
        method: req.method,
        isAuthenticated: !!req.session?.userId,
        isAdmin: !!req.session?.isAdmin
    });
    next();
});

// Protect all admin routes
router.use(isAuthenticated, isAdmin);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Admin route is working' });
});

// Get all orders
router.get('/orders', async (req, res) => {
    console.log('Fetching orders...');
    try {
        const sql = `
            SELECT o.*, 
                   GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')') as products,
                   GROUP_CONCAT(oi.price) as prices
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.pid
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `;
        
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Orders fetched:', rows);
        
        if (!rows || !Array.isArray(rows)) {
            throw new Error('Invalid database response');
        }
        
        // Format the response
        const orders = rows.map(row => ({
            orderId: row.order_id,
            username: row.username || 'guest',
            currency: row.currency || 'HKD',
            merchantEmail: row.merchant_email,
            totalAmount: row.total_amount || 0,
            status: row.status || 'pending',
            createdAt: row.created_at,
            products: row.products ? row.products.split(',') : [],
            prices: row.prices ? row.prices.split(',').map(Number) : []
        }));
        
        res.json(orders);
    } catch (error) {
        console.error('Error in orders route:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Helper function to sanitize filename
const sanitizeFilename = (filename) => {
    // Remove special character and space and convert to lowercase
    return filename
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') 
        .replace(/^-|-$/g, ''); 
};

// Configure multer  temporary storage
const storage = multer.diskStorage({
    destination: './public/images/temp/',
    filename: (req, file, cb) => {
        // Get product name 
        const productName = sanitizeFilename(req.body.name);
        const timestamp = Date.now();
        const uniqueName = `${productName}-${timestamp}${path.extname(file.originalname)}`;
        req.generatedFilename = uniqueName.replace('temp-', '');
        cb(null, `temp-${uniqueName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only (jpg, jpeg, png, gif)!');
        }
    }
});

const ensureDirectoryExists = async () => {
    const dirs = ['./public/images/temp', './public/images/products'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.error(`Error creating directory ${dir}:`, error);
            }
        }
    }
};

ensureDirectoryExists();

// Helper function to process image
const processImage = async (inputPath, outputPath, width, height) => {
    try {
        await sharp(inputPath)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFile(outputPath);
    } catch (error) {
        throw new Error(`Error processing image: ${error.message}`);
    }
};

// Validation middleware
const validateProduct = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .escape(),
    body('price')
        .isFloat({ min: 0 })
        .toFloat(),
    body('catid')
        .isInt()
        .toInt(),
    body('description')
        .optional()
        .trim()
        .escape()
];

// Sanitize and validate product submission
router.post('/products', upload.single('image'), validateProduct, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Sanitize inputs
        const sanitizedData = {
            name: xss(req.body.name),
            price: parseFloat(req.body.price),
            catid: parseInt(req.body.catid),
            description: req.body.description ? xss(req.body.description) : ''
        };

        let mainImage = null;
        let thumbnailImage = null;

        if (req.file) {
            let tempFilePath = req.file.path;
            const productName = sanitizeFilename(sanitizedData.name);
            const timestamp = Date.now();
            mainImage = `${productName}-${timestamp}${path.extname(req.file.originalname)}`;
            thumbnailImage = `${productName}-${timestamp}-thumb${path.extname(req.file.originalname)}`;

            const mainImagePath = path.join('./public/images/products', mainImage);
            const thumbnailPath = path.join('./public/images/products', thumbnailImage);

            // Process images
            await Promise.all([
                processImage(tempFilePath, thumbnailPath, 200, 200),
                processImage(tempFilePath, mainImagePath, 800, 800)
            ]);

            // Delete temp file after processing - not working - don't know why
            setTimeout(async () => {
                try {
                    await fs.unlink(tempFilePath);
                } catch (error) {
                    console.warn('Could not delete temp file:', error.message);
                }
            }, 100);
        }

        // Input validation
        if (!sanitizedData.catid || !sanitizedData.name || !sanitizedData.price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Use the addProduct function from db.js
        const productId = await addProduct({
            ...sanitizedData,
            image: mainImage,
            thumbnail: thumbnailImage
        });

        res.json({ 
            id: productId,
            message: 'Product added successfully',
            image: mainImage,
            thumbnail: thumbnailImage
        });
    } catch (error) {
        console.error('Error in product upload:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/products/:pid', upload.single('image'), validateProduct, async (req, res) => {
    let tempFilePath = null;
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Sanitize inputs
        const sanitizedData = {
            catid: parseInt(req.body.catid),
            name: xss(req.body.name),
            price: parseFloat(req.body.price),
            description: req.body.description ? xss(req.body.description) : ''
        };

        let mainImage = null;
        let thumbnailImage = null;

        if (req.file) {
            // Process new image
            tempFilePath = req.file.path;
            const productName = sanitizeFilename(sanitizedData.name);
            const timestamp = Date.now();
            mainImage = `${productName}-${timestamp}${path.extname(req.file.originalname)}`;
            thumbnailImage = `${productName}-${timestamp}-thumb${path.extname(req.file.originalname)}`;

            const mainImagePath = path.join('./public/images/products', mainImage);
            const thumbnailPath = path.join('./public/images/products', thumbnailImage);

            await Promise.all([
                processImage(tempFilePath, thumbnailPath, 200, 200),
                processImage(tempFilePath, mainImagePath, 800, 800)
            ]);

            // Delete old images
            const oldProduct = await getProduct(req.params.pid);
            if (oldProduct) {
                if (oldProduct.image) {
                    try {
                        await fs.unlink(path.join('./public/images/products', oldProduct.image));
                    } catch (error) {
                        console.warn('Could not delete old main image:', error.message);
                    }
                }
                if (oldProduct.thumbnail) {
                    try {
                        await fs.unlink(path.join('./public/images/products', oldProduct.thumbnail));
                    } catch (error) {
                        console.warn('Could not delete old thumbnail:', error.message);
                    }
                }
            }

            // Delete temp file
            setTimeout(async () => {
                try {
                    await fs.unlink(tempFilePath);
                } catch (error) {
                    console.warn('Could not delete temp file:', error.message);
                }
            }, 100);
        }

        // Update database with sanitized data
        await updateProduct(req.params.pid, {
            ...sanitizedData,
            image: mainImage || undefined,
            thumbnail: thumbnailImage || undefined
        });

        res.json({ 
            message: 'Product updated successfully',
            product: {
                ...sanitizedData,
                pid: req.params.pid,
                image: mainImage,
                thumbnail: thumbnailImage
            }
        });
    } catch (error) {
        console.error('Error in product update:', error);
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (deleteError) {
                console.warn('Could not delete temp file:', deleteError.message);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/products/:pid', async (req, res) => {
    try {
        // Get product info for deleting image
        const product = await getProduct(req.params.pid);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Delete images if they exist
        if (product.image) {
            try {
                await fs.unlink(path.join('./public/images/products', product.image));
            } catch (error) {
                console.warn('Could not delete main image:', error.message);
            }
        }
        if (product.thumbnail) {
            try {
                await fs.unlink(path.join('./public/images/products', product.thumbnail));
            } catch (error) {
                console.warn('Could not delete thumbnail:', error.message);
            }
        }

        // Delete from database using a new function in db.js
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM products WHERE pid = ?', [req.params.pid], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        res.json({ 
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/categories', async (req, res) => {
    try {
        const { name } = req.body;
        const sql = 'INSERT INTO categories (name) VALUES (?)';
        db.run(sql, [name], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Find your upload product image route and update it
router.post('/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.filename;
        console.log('File uploaded:', filename);
        console.log('File path:', req.file.path);
        
        res.json({ 
            success: true, 
            filename,
            url: `/images/products/${filename}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// Delete category
router.delete('/categories/:catid', async (req, res) => {
    try {
        const catid = req.params.catid;
        
        // Check if category has products first
        const checkSql = 'SELECT COUNT(*) as count FROM products WHERE catid = ?';
        
        db.get(checkSql, [catid], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Cannot delete category with products. Move or delete the products first.' 
                });
            }
            
            // No products, safe to delete
            const deleteSql = 'DELETE FROM categories WHERE catid = ?';
            db.run(deleteSql, [catid], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Category not found' });
                }
                
                res.json({ message: 'Category deleted successfully' });
            });
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 