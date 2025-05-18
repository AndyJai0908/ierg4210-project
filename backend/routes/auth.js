const express = require('express');
const router = express.Router();
const { verifyUser, updatePassword } = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { db } = require('../database/db');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Orders endpoint - handles both authenticated and guest users (not guest users anymore)
router.get('/orders', async (req, res) => {
    try {
        // Get user_id from session or use 'guest' condition
        const userId = req.session?.userId;
        let query;
        let params;

        if (userId) {
            // For logged-in users
            query = `SELECT orders.*, GROUP_CONCAT(products.name) as products, 
                    GROUP_CONCAT(order_items.price) as prices,
                    GROUP_CONCAT(order_items.quantity) as quantities
                    FROM orders 
                    LEFT JOIN order_items ON orders.order_id = order_items.order_id
                    LEFT JOIN products ON order_items.product_id = products.pid
                    WHERE orders.user_id = ?
                    GROUP BY orders.order_id
                    ORDER BY orders.created_at DESC
                    LIMIT 5`;
            params = [userId];
        } else {
            // For guest users (where user_id is NULL) 
            // this function is not used anymore since the member portal is updated and guest cannot see orders now, but kept for reference as it is reported as a bug
            query = `SELECT orders.*, GROUP_CONCAT(products.name) as products, 
                    GROUP_CONCAT(order_items.price) as prices,
                    GROUP_CONCAT(order_items.quantity) as quantities
                    FROM orders 
                    LEFT JOIN order_items ON orders.order_id = order_items.order_id
                    LEFT JOIN products ON order_items.product_id = products.pid
                    WHERE orders.user_id IS NULL
                    GROUP BY orders.order_id
                    ORDER BY orders.created_at DESC
                    LIMIT 5`;
            params = [];
        }

        console.log('Session info:', {
            sessionExists: !!req.session,
            userId: req.session?.userId,
            query: query,
            params: params
        });

        // Get orders from the database
        const orders = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    console.log('Found orders:', rows);
                    resolve(rows);
                }
            });
        });

        // Format the orders data
        const formattedOrders = orders.map(order => ({
            orderId: order.order_id,
            createdAt: order.created_at,
            status: order.status,
            totalAmount: order.total_amount,
            products: order.products ? order.products.split(',') : [],
            prices: order.prices ? order.prices.split(',').map(price => parseFloat(price)) : [],
            quantities: order.quantities ? order.quantities.split(',').map(qty => parseInt(qty)) : [],
            currency: order.currency || 'HKD'
        }));

        console.log('Sending formatted orders:', formattedOrders);
        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// CSRF token endpoint
router.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Login status check endpoint
router.get('/status', (req, res) => {
    console.log('Checking auth status:', {
        sessionExists: !!req.session,
        userId: req.session?.userId,
        isAdmin: req.session?.isAdmin
    });

    if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
            isLoggedIn: false,
            isAdmin: false,
            message: 'Not authenticated'
        });
    }

    res.json({
        isLoggedIn: true,
        isAdmin: req.session.isAdmin || false,
        user: {
            email: req.session.email,
            isAdmin: req.session.isAdmin || false
        }
    });
});

router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for:', email);
        
        if (!email || !password) {
            console.error('Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const user = await verifyUser(email, password);
        
        if (!user) {
            console.log('Login failed: Invalid credentials for', email);
            return res.status(401).json({ error: 'Wrong email or password' });
        }

        console.log('User verified successfully:', {
            userId: user.userid,
            email: user.email,
            isAdmin: user.is_admin === 1
        });

        // Set session data
        req.session.userId = user.userid;
        req.session.email = user.email;
        req.session.isAdmin = user.is_admin === 1;
        req.session.user = {
            email: user.email,
            isAdmin: user.is_admin === 1
        };

        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session error' });
            }

            console.log('Session saved successfully:', {
                sessionId: req.sessionID,
                userId: req.session.userId,
                isAdmin: req.session.isAdmin
            });

            res.json({ 
                success: true, 
                isAdmin: user.is_admin === 1,
                user: {
                    email: user.email,
                    isAdmin: user.is_admin === 1
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    if (req.session) {
    req.session.destroy((err) => {
        if (err) {
                console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
            res.clearCookie('sessionId');
        res.json({ success: true, message: 'Logged out successfully' });
    });
    } else {
        res.json({ success: true, message: 'Already logged out' });
    }
});

// Change password route (requires authentication)
router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Validate password requirements
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ 
                error: 'New password must be at least 8 characters long' 
            });
        }

        // Verify current password
        const user = await verifyUser(req.session.email, currentPassword);
        if (!user) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        await updatePassword(user.userid, newPassword);

        // Clear session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            res.clearCookie('sessionId');
        res.json({ 
            success: true, 
            message: 'Password changed successfully. Please log in again.' 
            });
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Registration route (phase 6)
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email already exists
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (user) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Create a new user
            try {
                // Generate salt for password
                const salt = await bcrypt.genSalt(10);
                
                // Hash password with salt
                const hashedPassword = await bcrypt.hash(password, salt);
                
                // Insert user with hashed password
                const sql = 'INSERT INTO users (email, password, salt, is_admin) VALUES (?, ?, ?, 0)';
                
                db.run(sql, [email, hashedPassword, salt], function(err) {
                    if (err) {
                        console.error('User creation error:', err);
                        return res.status(500).json({ error: 'Failed to create user' });
                    }
                    
                    console.log('User registered successfully:', {
                        userId: this.lastID,
                        email
                    });
                    
                    res.status(201).json({ 
                        success: true, 
                        message: 'Registration successful' 
                    });
                });
            } catch (hashError) {
                console.error('Password hashing error:', hashError);
                res.status(500).json({ error: 'Password processing failed' });
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'An error occurred during registration' });
    }
});

module.exports = router; 