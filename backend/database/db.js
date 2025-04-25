const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

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
const verifyUser = async (email, password) => {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            async (err, user) => {
                if (err) reject(err);
                if (!user) resolve(null);
                
                const hashedPassword = await hashPassword(password, user.salt);
                if (hashedPassword === user.password) {
                    resolve(user);
                } else {
                    resolve(null);
                }
            }
        );
    });
};

// Add this function with your other database methods
const getAllProducts = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM products', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const getAllCategories = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM categories', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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