const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const db = require('../database/db');
const router = express.Router();

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

router.post('/products', upload.single('image'), async (req, res) => {
    let tempFilePath = null;
    try {
        const { catid, name, price, description } = req.body;
        let mainImage = null;
        let thumbnailImage = null;

        if (req.file) {
            tempFilePath = req.file.path;
            const productName = sanitizeFilename(name);
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
        if (!catid || !name || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const sql = `INSERT INTO products (catid, name, price, description, image, thumbnail) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [catid, name, price, description, mainImage, thumbnailImage], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                id: this.lastID,
                message: 'Product added successfully',
                image: mainImage,
                thumbnail: thumbnailImage
            });
        });
    } catch (error) {
        console.error('Error in product upload:', error);
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

// Update product
router.put('/products/:pid', upload.single('image'), async (req, res) => {
    let tempFilePath = null;
    try {
        const { catid, name, price, description } = req.body;
        let mainImage = null;
        let thumbnailImage = null;

        if (req.file) {
            // Process new image
            tempFilePath = req.file.path;
            const productName = sanitizeFilename(name);
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
            const oldProduct = await new Promise((resolve, reject) => {
                db.get('SELECT image, thumbnail FROM products WHERE pid = ?', [req.params.pid], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

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

        // Update database
        const sql = req.file
            ? `UPDATE products 
               SET catid = ?, name = ?, price = ?, description = ?, image = ?, thumbnail = ?
               WHERE pid = ?`
            : `UPDATE products 
               SET catid = ?, name = ?, price = ?, description = ?
               WHERE pid = ?`;

        const params = req.file
            ? [catid, name, price, description, mainImage, thumbnailImage, req.params.pid]
            : [catid, name, price, description, req.params.pid];

        db.run(sql, params, function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                changes: this.changes,
                message: 'Product updated successfully'
            });
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
        const product = await new Promise((resolve, reject) => {
            db.get('SELECT image, thumbnail FROM products WHERE pid = ?', [req.params.pid], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Delete images if they exist
        if (product) {
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
        }

        // Delete from database
        db.run('DELETE FROM products WHERE pid = ?', [req.params.pid], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                changes: this.changes,
                message: 'Product deleted successfully'
            });
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 