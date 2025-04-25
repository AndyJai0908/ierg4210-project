const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.join(__dirname, 'shop.db'));

async function seedDatabase() {
    try {
        // Hash the admin password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Insert admin user if not exists
        db.run(`
            INSERT OR IGNORE INTO users (username, password, email, role)
            VALUES (?, ?, ?, ?)
        `, ['admin', hashedPassword, 'admin@example.com', 'admin'], function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('Admin user created successfully');
            }
        });

    } catch (error) {
        console.error('Error in seeding database:', error);
    } finally {
        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

seedDatabase(); 