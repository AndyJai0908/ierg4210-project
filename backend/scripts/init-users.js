const { createUser } = require('../database/db');

async function initializeUsers() {
    try {
        // Create admin user
        await createUser('admin@example.com', 'AdminPassword123!', 1);
        console.log('Admin user created');

        // Create normal user
        await createUser('user@example.com', 'UserPassword123!', 0);
        console.log('Normal user created');
    } catch (error) {
        console.error('Error creating users:', error);
    }
}

initializeUsers(); 