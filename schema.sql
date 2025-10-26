-- ==========================================
-- BOOKBUDDY HOTEL MANAGEMENT SYSTEM
-- Complete Database Schema Creation
-- ==========================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS order_detail CASCADE;
DROP TABLE IF EXISTS food_order CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS hotel_facility CASCADE;
DROP TABLE IF EXISTS facility CASCADE;
DROP TABLE IF EXISTS room_type CASCADE;
DROP TABLE IF EXISTS assigned_task CASCADE;
DROP TABLE IF EXISTS food_item CASCADE;
DROP TABLE IF EXISTS hotel CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- 1. USER Table (All Accounts: Customer, Staff, Manager)
CREATE TABLE "user" (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Customer', 'Staff', 'Manager')),
    phone_number VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. HOTEL Table (Properties)
CREATE TABLE hotel (
    hotel_id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    location VARCHAR(100) NOT NULL,
    address TEXT,
    rating NUMERIC(2, 1) DEFAULT 0.0,
    base_price_per_night NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(255)
);

-- 3. ROOM_TYPE Table (Room Categories)
CREATE TABLE room_type (
    room_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    max_capacity INT NOT NULL,
    price_multiplier NUMERIC(3, 2) DEFAULT 1.00
);

-- 4. ROOM Table (Physical Rooms)
CREATE TABLE room (
    room_number VARCHAR(10),
    hotel_id INT NOT NULL,
    room_type_id INT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Vacant', 'Occupied', 'Cleaning')),
    
    PRIMARY KEY (room_number, hotel_id),
    
    FOREIGN KEY (hotel_id) REFERENCES hotel(hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id) ON DELETE RESTRICT
);

-- 5. BOOKING Table (Reservations)
CREATE TABLE booking (
    booking_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    room_number VARCHAR(10) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_nights INT NOT NULL,
    grand_total NUMERIC(10, 2) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (room_number, hotel_id) REFERENCES room(room_number, hotel_id) ON DELETE RESTRICT,
    
    CHECK (check_out_date > check_in_date)
);

-- 6. FOOD_ITEM Table (Menu)
CREATE TABLE food_item (
    food_item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    price NUMERIC(7, 2) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Beverages')),
    type VARCHAR(10) NOT NULL CHECK (type IN ('Veg', 'Non-Veg', 'General'))
);

-- 7. FOOD_ORDER Table (Order Header)
CREATE TABLE food_order (
    order_id SERIAL PRIMARY KEY,
    booking_id INT UNIQUE NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Delivered', 'Cancelled')),
    
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE
);

-- 8. ORDER_DETAIL Table (Order Line Items)
CREATE TABLE order_detail (
    order_id INT NOT NULL,
    food_item_id INT NOT NULL,
    quantity INT NOT NULL,
    subtotal NUMERIC(7, 2) NOT NULL,
    
    PRIMARY KEY (order_id, food_item_id),
    
    FOREIGN KEY (order_id) REFERENCES food_order(order_id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_item(food_item_id) ON DELETE RESTRICT,
    
    CHECK (quantity > 0)
);

-- 9. ASSIGNED_TASK Table (Staff Management)
CREATE TABLE assigned_task (
    task_id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    details TEXT,
    due_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Complete', 'Overdue')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (staff_id) REFERENCES "user"(user_id) ON DELETE RESTRICT
);

-- 10. FACILITY Table (Facilities)
CREATE TABLE facility (
    facility_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 11. HOTEL_FACILITY Table (Many-to-Many Facility Management)
CREATE TABLE hotel_facility (
    hotel_id INT NOT NULL,
    facility_id INT NOT NULL,
    
    PRIMARY KEY (hotel_id, facility_id),
    
    FOREIGN KEY (hotel_id) REFERENCES hotel(hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facility(facility_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_role ON "user"(role);
CREATE INDEX idx_hotel_name ON hotel(name);
CREATE INDEX idx_hotel_location ON hotel(location);
CREATE INDEX idx_booking_user ON booking(user_id);
CREATE INDEX idx_booking_hotel ON booking(hotel_id);
CREATE INDEX idx_booking_dates ON booking(check_in_date, check_out_date);
CREATE INDEX idx_food_item_category ON food_item(category);
CREATE INDEX idx_food_item_type ON food_item(type);
CREATE INDEX idx_assigned_task_staff ON assigned_task(staff_id);
CREATE INDEX idx_assigned_task_status ON assigned_task(status);
CREATE INDEX idx_room_hotel ON room(hotel_id);
CREATE INDEX idx_room_status ON room(status);

-- Display success message
SELECT 'Database schema created successfully!' as status;


-- ==========================================
-- STATIC DATA INSERTION (Non-User Data)
-- ==========================================

-- Insert Room Types
INSERT INTO room_type (name, max_capacity, price_multiplier) VALUES
('Standard', 2, 1.00),
('Deluxe', 3, 1.50),
('Suite', 4, 2.00),
('Presidential', 6, 3.00);

-- Insert Facilities
INSERT INTO facility (name) VALUES
('WiFi'),
('Swimming Pool'),
('Gym'),
('Restaurant'),
('Spa'),
('Parking'),
('Room Service'),
('Business Center'),
('Conference Room'),
('Laundry Service'),
('Bar/Lounge'),
('Beach Front'),
('City Center'),
('Pet Friendly'),
('Sun View'),
('Resort Property');

-- Insert Hotels (10 hotels as per your requirement)
INSERT INTO hotel (name, location, address, rating, base_price_per_night, image_url) VALUES
('Trident Hotel', 'Chennai', '37, Mahatma Gandhi Road, Nungambakkam, Chennai', 4.8, 15000.00, 'trident.jpg'),
('Woodlands Inn', 'Chennai', '72, Dr. Radhakrishnan Salai, Mylapore, Chennai', 3.5, 7500.00, 'woodland.jpg'),
('The Leela Palace', 'Bangalore', '23, Old Airport Road, Bangalore', 4.9, 22000.00, 'the-leela-palace.jpg'),
('Taj Coromandel', 'Chennai', '37, Mahatma Gandhi Road, Nungambakkam, Chennai', 4.5, 17000.00, 'taj-coromandel.jpg'),
('Novotel', 'Chennai', '457, Anna Salai, Teynampet, Chennai', 4.0, 10000.00, 'novotel.jpg'),
('Taz Kamar Inn', 'Chennai', '15, Cathedral Road, Chennai', 3.0, 5000.00, 'taz-kamar-inn.jpg'),
('Benzz Park', 'Chennai', '123, Mount Road, Chennai', 4.2, 11000.00, 'benzz-park.jpg'),
('Sheraton Grand', 'Chennai', '234, Anna Salai, Chennai', 4.5, 14000.00, 'sheraton.jpg'),
('Ramada Plaza', 'Chennai', '345, OMR, Chennai', 3.8, 7500.00, 'ramada.jpg'),
('ITC Grand Chola', 'Chennai', '63, Mount Road, Guindy, Chennai', 4.7, 25000.00, 'itc-hotel.jpg');

-- Insert Rooms for each hotel (3-10 rooms per hotel)
-- Trident Hotel (8 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 1, 1, 'Vacant'), ('102', 1, 1, 'Vacant'), ('103', 1, 1, 'Vacant'), ('104', 1, 1, 'Vacant'),
('201', 1, 2, 'Vacant'), ('202', 1, 2, 'Vacant'), ('301', 1, 3, 'Vacant'), ('401', 1, 4, 'Vacant');

-- Woodlands Inn (5 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 2, 1, 'Vacant'), ('102', 2, 1, 'Vacant'), ('103', 2, 1, 'Vacant'),
('201', 2, 2, 'Vacant'), ('202', 2, 2, 'Vacant');

-- The Leela Palace (10 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 3, 1, 'Vacant'), ('102', 3, 1, 'Vacant'), ('103', 3, 1, 'Vacant'), ('104', 3, 1, 'Vacant'),
('201', 3, 2, 'Vacant'), ('202', 3, 2, 'Vacant'), ('203', 3, 2, 'Vacant'),
('301', 3, 3, 'Vacant'), ('302', 3, 3, 'Vacant'), ('401', 3, 4, 'Vacant');

-- Taj Coromandel (7 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 4, 1, 'Vacant'), ('102', 4, 1, 'Vacant'), ('103', 4, 1, 'Vacant'),
('201', 4, 2, 'Vacant'), ('202', 4, 2, 'Vacant'),
('301', 4, 3, 'Vacant'), ('401', 4, 4, 'Vacant');

-- Novotel (6 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 5, 1, 'Vacant'), ('102', 5, 1, 'Vacant'), ('103', 5, 1, 'Vacant'),
('201', 5, 2, 'Vacant'), ('202', 5, 2, 'Vacant'), ('301', 5, 3, 'Vacant');

-- Taz Kamar Inn (4 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 6, 1, 'Vacant'), ('102', 6, 1, 'Vacant'),
('201', 6, 2, 'Vacant'), ('202', 6, 2, 'Vacant');

-- Benzz Park (9 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 7, 1, 'Vacant'), ('102', 7, 1, 'Vacant'), ('103', 7, 1, 'Vacant'),
('201', 7, 2, 'Vacant'), ('202', 7, 2, 'Vacant'), ('203', 7, 2, 'Vacant'),
('301', 7, 3, 'Vacant'), ('302', 7, 3, 'Vacant'), ('401', 7, 4, 'Vacant');

-- Sheraton Grand (8 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 8, 1, 'Vacant'), ('102', 8, 1, 'Vacant'), ('103', 8, 1, 'Vacant'), ('104', 8, 1, 'Vacant'),
('201', 8, 2, 'Vacant'), ('202', 8, 2, 'Vacant'),
('301', 8, 3, 'Vacant'), ('401', 8, 4, 'Vacant');

-- Ramada Plaza (5 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 9, 1, 'Vacant'), ('102', 9, 1, 'Vacant'),
('201', 9, 2, 'Vacant'), ('202', 9, 2, 'Vacant'), ('301', 9, 3, 'Vacant');

-- ITC Grand Chola (10 rooms)
INSERT INTO room (room_number, hotel_id, room_type_id, status) VALUES
('101', 10, 1, 'Vacant'), ('102', 10, 1, 'Vacant'), ('103', 10, 1, 'Vacant'), ('104', 10, 1, 'Vacant'),
('201', 10, 2, 'Vacant'), ('202', 10, 2, 'Vacant'), ('203', 10, 2, 'Vacant'),
('301', 10, 3, 'Vacant'), ('302', 10, 3, 'Vacant'), ('401', 10, 4, 'Vacant');

-- Insert Hotel Facilities (assigning facilities to hotels)
-- Trident Hotel facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 13);

-- Woodlands Inn facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(2, 1), (2, 6), (2, 7), (2, 10), (2, 13);

-- The Leela Palace facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9), (3, 10), (3, 11), (3, 12), (3, 15), (3, 16);

-- Taj Coromandel facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(4, 1), (4, 2), (4, 3), (4, 4), (4, 6), (4, 7), (4, 8), (4, 10), (4, 11), (4, 13);

-- Novotel facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(5, 1), (5, 2), (5, 3), (5, 4), (5, 6), (5, 7), (5, 10), (5, 11), (5, 13), (5, 14);

-- Taz Kamar Inn facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(6, 1), (6, 6), (6, 7), (6, 10), (6, 13);

-- Benzz Park facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(7, 1), (7, 2), (7, 3), (7, 4), (7, 6), (7, 7), (7, 10), (7, 11), (7, 13);

-- Sheraton Grand facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 6), (8, 7), (8, 8), (8, 10), (8, 11), (8, 12), (8, 15), (8, 16);

-- Ramada Plaza facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(9, 1), (9, 4), (9, 6), (9, 7), (9, 10), (9, 11), (9, 13);

-- ITC Grand Chola facilities
INSERT INTO hotel_facility (hotel_id, facility_id) VALUES
(10, 1), (10, 2), (10, 3), (10, 4), (10, 5), (10, 6), (10, 7), (10, 8), (10, 9), (10, 10), (10, 11), (10, 13);

-- Insert Food Items
INSERT INTO food_item (name, price, category, type) VALUES
-- Breakfast Items
('Idli Sambar (2pcs)', 100.00, 'Breakfast', 'Veg'),
('Masala Dosa', 120.00, 'Breakfast', 'Veg'),
('Bread Omelette (2 Eggs)', 200.00, 'Breakfast', 'Non-Veg'),
('Pongal', 80.00, 'Breakfast', 'Veg'),
('Upma', 60.00, 'Breakfast', 'Veg'),
('Puri with Curry', 90.00, 'Breakfast', 'Veg'),

-- Lunch Items
('Chicken Biryani', 450.00, 'Lunch', 'Non-Veg'),
('Paneer Tikka Masala', 380.00, 'Lunch', 'Veg'),
('Fish Curry', 420.00, 'Lunch', 'Non-Veg'),
('Dal Makhani', 180.00, 'Lunch', 'Veg'),
('Mutton Biryani', 500.00, 'Lunch', 'Non-Veg'),
('Veg Biryani', 250.00, 'Lunch', 'Veg'),

-- Dinner Items
('Butter Chicken', 550.00, 'Dinner', 'Non-Veg'),
('Paneer Butter Masala', 350.00, 'Dinner', 'Veg'),
('Tandoori Chicken', 480.00, 'Dinner', 'Non-Veg'),
('Dal Tadka', 150.00, 'Dinner', 'Veg'),
('Mutton Curry', 520.00, 'Dinner', 'Non-Veg'),
('Malai Kofta', 320.00, 'Dinner', 'Veg'),

-- Beverages
('Coffee', 80.00, 'Beverages', 'General'),
('Tea', 60.00, 'Beverages', 'General'),
('Fresh Juice', 120.00, 'Beverages', 'General'),
('Lassi', 100.00, 'Beverages', 'General'),
('Soft Drink', 50.00, 'Beverages', 'General'),
('Mineral Water', 30.00, 'Beverages', 'General');

-- Display completion message
SELECT 'Static data insertion completed successfully!' as status;
SELECT 'Users will be created via login/registration system' as note;