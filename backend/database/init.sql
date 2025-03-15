-- Drop existing tables if they exist
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- Categories table
CREATE TABLE categories (
    catid INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL
);

-- Products table
CREATE TABLE products (
    pid INTEGER PRIMARY KEY AUTOINCREMENT,
    catid INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image TEXT,
    thumbnail TEXT,
    FOREIGN KEY (catid) REFERENCES categories(catid)
);

-- Categories
INSERT INTO categories (name) VALUES
    ('Electronics'),
    ('Sports'),
    ('Fashion');

-- Products
INSERT INTO products (catid, name, price, description) VALUES
    -- Electronics (catid = 1)
    (1, 'PlayStation 5', 3899, 'Next-gen gaming console with stunning graphics and fast loading times.'),
    (1, 'Nintendo Switch', 2399, 'Hybrid gaming console for both home and portable gaming.'),
    
    -- Sports (catid = 2)
    (2, 'Basketball', 229, 'Professional grade basketball for indoor/outdoor use.'),
    (2, 'Tennis Racket', 459, 'Professional tennis racket with excellent control and power.'),
    
    -- Fashion (catid = 3)
    (3, 'T-Shirt', 159, 'Comfortable cotton t-shirt for everyday wear.'),
    (3, 'Denim Jeans', 459, 'Classic fit denim jeans with excellent quality.');