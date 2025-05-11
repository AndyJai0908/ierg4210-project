const { db, createUser } = require('../database/db');

async function createAdminUser() {
    try {
        // First, remove existing admin
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE email = ?', ['admin@example.com'], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Create new admin user
        await createUser('admin2@example.com', 'admin1234', 1);
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        db.close();
    }
}

createAdminUser(); 