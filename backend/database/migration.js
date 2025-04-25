const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Run migrations
db.serialize(() => {
    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            userid INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'customer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(userid)
        )
    `);

    // Create orders table
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            order_id VARCHAR(255) PRIMARY KEY,
            invoice VARCHAR(255) NOT NULL,
            custom VARCHAR(255) NOT NULL,
            payment_status VARCHAR(50) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating orders table:', err);
        } else {
            console.log('Orders table created successfully');
        }
    });

    // Create order_items table
    db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id VARCHAR(255) NOT NULL,
            product_id INTEGER NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(order_id),
            FOREIGN KEY (product_id) REFERENCES products(pid)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating order_items table:', err);
        } else {
            console.log('Order_items table created successfully');
        }
    });

    // Add thumbnail column if it doesn't exist
    db.run(`
        ALTER TABLE products 
        ADD COLUMN thumbnail TEXT;
    `, (err) => {
        if (err) {
            // Column might already exist, which is fine
            if (!err.message.includes('duplicate column name')) {
                console.error('Migration error:', err);
            }
        } else {
            console.log('Successfully added thumbnail column');
        }
    });
});

// Close the database connection when done
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
}, 1000); // Give time for migrations to complete 