-- Create sample tables
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    age INTEGER,
    city VARCHAR,
    created_at TIMESTAMP
);

INSERT INTO users
SELECT
    i as id,
    'User ' || i as name,
    'user' || i || '@example.com' as email,
    20 + (i % 50) as age,
    CASE (i % 5)
        WHEN 0 THEN 'Tokyo'
        WHEN 1 THEN 'Osaka'
        WHEN 2 THEN 'Nagoya'
        WHEN 3 THEN 'Fukuoka'
        ELSE 'Sapporo'
    END as city,
    NOW() - INTERVAL (i * 24) HOUR as created_at
FROM generate_series(1, 100) as t(i);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name VARCHAR,
    category VARCHAR,
    price DECIMAL(10,2),
    stock INTEGER,
    rating DECIMAL(2,1)
);

INSERT INTO products
SELECT
    i as id,
    'Product ' || i as name,
    CASE (i % 5)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Clothing'
        WHEN 2 THEN 'Food'
        WHEN 3 THEN 'Books'
        ELSE 'Home'
    END as category,
    ROUND(10 + (random() * 990), 2) as price,
    CAST(random() * 1000 AS INTEGER) as stock,
    ROUND(1 + (random() * 4), 1) as rating
FROM generate_series(1, 50) as t(i);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    total_price DECIMAL(10,2),
    status VARCHAR,
    order_date DATE
);

INSERT INTO orders
SELECT
    i as id,
    1 + (i % 100) as user_id,
    1 + (i % 50) as product_id,
    1 + (i % 10) as quantity,
    ROUND(100 + (random() * 900), 2) as total_price,
    CASE (i % 4)
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'processing'
        WHEN 2 THEN 'shipped'
        ELSE 'delivered'
    END as status,
    CURRENT_DATE - INTERVAL (i % 365) DAY as order_date
FROM generate_series(1, 500) as t(i);

-- Show summary
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;
