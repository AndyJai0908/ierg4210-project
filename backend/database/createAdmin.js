const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

async function createAdminUser() {
    try {
        const email = "newadmin@example.com";
        const password = "admin123";
        const isAdmin = 1; // 1 = admin, 0 = regular user

        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Creating new admin account...');
        console.log('Email:', email);
        console.log('Is Admin:', isAdmin);

        // Check if user already exists 
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                console.error('Error checking for existing user:', err);
                closeDatabase();
                return;
            }

            if (row) {
                console.log('User already exists with this email.');
                closeDatabase();
                return;
            }

            // Insert new admin user
            const sql = 'INSERT INTO users (email, password, salt, is_admin) VALUES (?, ?, ?, ?)';
            db.run(sql, [email, hashedPassword, salt, isAdmin], function(err) {
                if (err) {
                    console.error('Error creating admin user:', err);
                } else {
                    console.log('Admin user created successfully with ID:', this.lastID);
                }
                closeDatabase();
            });
        });

    } catch (error) {
        console.error('Error creating admin account:', error);
        closeDatabase();
    }
}

function closeDatabase() {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
}

createAdminUser();
