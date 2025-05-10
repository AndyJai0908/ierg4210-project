const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to database');
    }
});

// Get product by ID
const getProduct = (pid) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM products WHERE pid = ?', 
            [pid],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
};

// Add product
const addProduct = (product) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO products (catid, name, price, description, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)',
            [product.catid, product.name, product.price, product.description, product.image, product.thumbnail],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

// Update product
const updateProduct = (pid, product) => {
    return new Promise((resolve, reject) => {
        const updates = [];
        const values = [];
        
        // Only update fields that are provided
        if (product.catid !== undefined) {
            updates.push('catid = ?');
            values.push(product.catid);
        }
        if (product.name !== undefined) {
            updates.push('name = ?');
            values.push(product.name);
        }
        if (product.price !== undefined) {
            updates.push('price = ?');
            values.push(product.price);
        }
        if (product.description !== undefined) {
            updates.push('description = ?');
            values.push(product.description);
        }
        if (product.image !== undefined) {
            updates.push('image = ?');
            values.push(product.image);
        }
        if (product.thumbnail !== undefined) {
            updates.push('thumbnail = ?');
            values.push(product.thumbnail);
        }
        
        // Add the WHERE clause parameter
        values.push(pid);
        
        const query = `UPDATE products SET ${updates.join(', ')} WHERE pid = ?`;
        
        db.run(query, values, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Add this to your existing db.js initialization
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        userid INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0
    )
`);

// Hash password with salt
const hashPassword = (password, salt) => {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err) reject(err);
            resolve(derivedKey.toString('hex'));
        });
    });
};

// Create user
const createUser = async (email, password, isAdmin = 0) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await hashPassword(password, salt);
    
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO users (email, password, salt, is_admin) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, salt, isAdmin],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
};

// Verify user
const verifyUser = (email, password) => {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to verify user: ${email}`);
        
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error during user lookup:', err);
                return reject(err);
            }
            
            if (!user) {
                console.log('User not found:', email);
                return resolve(null);
            }
            
            try {
                console.log(`User found: ${email}, checking password format`);
                
                let isMatch = false;
                
                // Check if password is in bcrypt format (starts with $2b$)
                if (user.password.startsWith('$2b$')) {
                    console.log('Using bcrypt comparison for:', email);
                    // For bcrypt passwords (new format)
                    isMatch = await bcrypt.compare(password, user.password);
                } else {
                    // For legacy passwords (old format)
                    console.log('Using legacy comparison for:', email);
                    
                    // IMPORTANT: Add this for debugging - log the stored password format
                    console.log('Stored password format:', {
                        email: email,
                        passwordStart: user.password.substring(0, 20) + '...',
                        saltStart: user.salt.substring(0, 20) + '...'
                    });
                    
                    // Try different possible legacy methods:
                    
                    // Method 1: Direct comparison (if passwords were stored in plain text)
                    if (password === user.password) {
                        console.log('Legacy method 1 (direct) matched');
                        isMatch = true;
                    }
                    
                    // Method 2: Using stored salt with SHA-256 (common legacy approach)
                    if (!isMatch) {
                        const hash = crypto.createHash('sha256')
                            .update(password + user.salt)
                            .digest('hex');
                        
                        if (hash === user.password) {
                            console.log('Legacy method 2 (sha256+salt) matched');
                            isMatch = true;
                        }
                    }
                    
                    // Method 3: Using MD5 with salt (older legacy approach)
                    if (!isMatch) {
                        const md5Hash = crypto.createHash('md5')
                            .update(password + user.salt)
                            .digest('hex');
                        
                        if (md5Hash === user.password) {
                            console.log('Legacy method 3 (md5+salt) matched');
                            isMatch = true;
                        }
                    }
                    
                    // Add more methods as needed
                }
                
                if (isMatch) {
                    console.log(`Password verification successful for ${email}`);
                    return resolve(user);
                } else {
                    console.log(`Password verification failed for ${email}`);
                    return resolve(null);
                }
            } catch (error) {
                console.error('Error during password verification:', error);
                return reject(error);
            }
        });
    });
};

// Add this function with your other database methods
const getAllProducts = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM products', [], (err, rows) => {
            if (err) {
                console.error('Database error in getAllProducts:', err);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
};

const getAllCategories = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM categories', [], (err, rows) => {
            if (err) {
                console.error('Database error in getAllCategories:', err);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
};

// Generate a secure random token
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Update password with new salt
const updatePassword = async (userId, newPassword) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await hashPassword(newPassword, salt);
    
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET password = ?, salt = ? WHERE userid = ?',
            [hashedPassword, salt, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Create order and order items
const createOrder = async (orderData, items) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                `INSERT INTO orders (
                    user_id, username, currency, merchant_email, 
                    total_amount, digest, salt, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderData.userId || null,
                    orderData.username || 'guest',
                    orderData.currency,
                    orderData.merchantEmail,
                    orderData.totalAmount,
                    orderData.digest,
                    orderData.salt,
                    'pending'
                ],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }

                    const orderId = this.lastID;
                    const itemPromises = items.map(item => {
                        return new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO order_items (
                                    order_id, product_id, quantity, price
                                ) VALUES (?, ?, ?, ?)`,
                                [orderId, item.pid, item.quantity, item.price],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    });

                    Promise.all(itemPromises)
                        .then(() => {
                            db.run('COMMIT');
                            resolve(orderId);
                        })
                        .catch(err => {
                            db.run('ROLLBACK');
                            reject(err);
                        });
                }
            );
        });
    });
};

// Get order by ID
const getOrder = (orderId) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT o.*, GROUP_CONCAT(oi.product_id || ':' || oi.quantity || ':' || oi.price) as items
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.order_id = ?
             GROUP BY o.order_id`,
            [orderId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
};

// Update order status
const updateOrderStatus = (orderId, status, transactionId = null) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE orders 
            SET status = ?, 
                transaction_id = COALESCE(?, transaction_id)
            WHERE order_id = ?
        `;
        
        db.run(sql, [status, transactionId, orderId], function(err) {
            if (err) {
                console.error('Error updating order status:', err);
                reject(err);
            } else {
                console.log(`Order ${orderId} status updated to ${status}`);
                resolve(this.changes);
            }
        });
    });
};

module.exports = {
    db,
    getProduct,
    addProduct,
    updateProduct,
    createUser,
    verifyUser,
    getAllProducts,
    getAllCategories,
    generateSecureToken,
    updatePassword,
    createOrder,
    getOrder,
    updateOrderStatus
}; 