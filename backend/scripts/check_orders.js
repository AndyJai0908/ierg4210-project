const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../database/database.sqlite'));

// Query to get all orders with their items
const query = `
    SELECT 
        o.order_id,
        o.username,
        o.currency,
        o.merchant_email,
        o.total_amount,
        o.digest,
        o.salt,
        o.status,
        o.created_at,
        GROUP_CONCAT(
            oi.product_id || ':' || 
            oi.quantity || ':' || 
            oi.price
        ) as order_items
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY o.order_id
    ORDER BY o.created_at DESC;
`;

// Execute the query
db.all(query, [], (err, rows) => {
    if (err) {
        console.error('Error fetching orders:', err);
        return;
    }

    console.log('\n=== Orders in Database ===\n');
    
    if (rows.length === 0) {
        console.log('No orders found.');
    } else {
        rows.forEach(order => {
            console.log(`Order ID: ${order.order_id}`);
            console.log(`Username: ${order.username}`);
            console.log(`Currency: ${order.currency}`);
            console.log(`Total Amount: ${order.total_amount}`);
            console.log(`Status: ${order.status}`);
            console.log(`Created At: ${order.created_at}`);
            console.log(`Digest: ${order.digest}`);
            console.log(`Salt: ${order.salt}`);
            
            if (order.order_items) {
                console.log('\nOrder Items:');
                order.order_items.split(',').forEach(item => {
                    const [productId, quantity, price] = item.split(':');
                    console.log(`- Product ID: ${productId}, Quantity: ${quantity}, Price: ${price}`);
                });
            }
            
            console.log('\n' + '='.repeat(50) + '\n');
        });
    }

    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
    });
}); 