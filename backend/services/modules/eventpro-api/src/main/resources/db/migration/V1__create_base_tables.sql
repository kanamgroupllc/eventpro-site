-- Flyway Migration: V1__create_base_tables.sql
-- Description: Creates all 12 core entity tables with indexes, constraints, and foreign keys
-- Database: PostgreSQL 15+

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Ticket Type Enum
CREATE TYPE ticket_type AS ENUM ('VIP', 'REGULAR', 'EARLY_BIRD');

-- Ticket Status Enum
CREATE TYPE ticket_status AS ENUM ('AVAILABLE', 'SOLD', 'RESERVED');

-- Order Status Enum
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- Payment Status Enum
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- Notification Type Enum
CREATE TYPE notification_type AS ENUM (
    'ORDER_CONFIRMATION',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'EVENT_REMINDER',
    'TICKET_READY',
    'SYSTEM_ANNOUNCEMENT'
);

-- Notification Delivery Type Enum
CREATE TYPE notification_delivery_type AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');

-- User Notification Status Enum
CREATE TYPE user_notification_status AS ENUM ('UNREAD', 'READ');

-- ============================================================================
-- TABLES (in dependency order)
-- ============================================================================

-- 1. Category Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    phone_number VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    location VARCHAR(255),
    profile_picture_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Address Table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Event Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    image_url VARCHAR(500),
    marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    organizer_id UUID NOT NULL,
    category_id UUID NOT NULL,
    address_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_event_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_event_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE
);

-- 5. Ticket Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    ticket_type ticket_type NOT NULL,
    ticket_status ticket_status NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    qr_code VARCHAR(500),
    print_out_url VARCHAR(500),
    event_id UUID NOT NULL,
    purchaser_id UUID,
    creator_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_purchaser FOREIGN KEY (purchaser_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 6. Cart Table
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quantity INTEGER NOT NULL,
    user_id UUID NOT NULL,
    ticket_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- 7. Order Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL,
    order_date TIMESTAMP NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 8. OrderItem Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    order_id UUID NOT NULL,
    ticket_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_item_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE RESTRICT
);

-- 9. Payment Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    status payment_status NOT NULL,
    payment_date TIMESTAMP,
    order_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
);

-- 10. Notification Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    delivery_type notification_delivery_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. UserNotification Table
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status user_notification_status NOT NULL,
    read_at TIMESTAMP,
    user_id UUID NOT NULL,
    notification_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_notification_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

-- 12. NotificationPreference Table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_preference_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE users ADD CONSTRAINT uk_user_email UNIQUE (email);
ALTER TABLE categories ADD CONSTRAINT uk_category_name UNIQUE (name);
ALTER TABLE orders ADD CONSTRAINT uk_order_number UNIQUE (order_number);
-- Partial unique index: transaction_id must be unique when provided (NOT NULL)
-- PostgreSQL allows multiple NULLs in unique constraints, but partial index is more explicit
CREATE UNIQUE INDEX uk_payment_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
ALTER TABLE carts ADD CONSTRAINT uk_cart_user_ticket UNIQUE (user_id, ticket_id);
ALTER TABLE notification_preferences ADD CONSTRAINT uk_notification_preference_user UNIQUE (user_id);

-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

-- Ticket constraints
ALTER TABLE tickets ADD CONSTRAINT chk_ticket_price_non_negative CHECK (price >= 0);
ALTER TABLE tickets ADD CONSTRAINT chk_ticket_end_after_start CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

-- Order constraints
ALTER TABLE orders ADD CONSTRAINT chk_order_total_non_negative CHECK (total_amount >= 0);

-- Payment constraints
ALTER TABLE payments ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);

-- Cart constraints
ALTER TABLE carts ADD CONSTRAINT chk_cart_quantity_positive CHECK (quantity > 0);

-- OrderItem constraints
ALTER TABLE order_items ADD CONSTRAINT chk_order_item_quantity_positive CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT chk_order_item_price_non_negative CHECK (price >= 0);

-- Event constraints
ALTER TABLE events ADD CONSTRAINT chk_event_end_after_start CHECK (end_time > start_time);

-- NotificationPreference constraints
ALTER TABLE notification_preferences ADD CONSTRAINT chk_notification_preference_at_least_one_enabled 
    CHECK (email_enabled = TRUE OR sms_enabled = TRUE OR push_enabled = TRUE);

-- UserNotification constraints
ALTER TABLE user_notifications ADD CONSTRAINT chk_user_notification_read_at 
    CHECK ((status = 'READ' AND read_at IS NOT NULL) OR (status = 'UNREAD' AND read_at IS NULL));

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_status ON users(status);
CREATE INDEX idx_user_role ON users(role);

-- Category indexes
CREATE INDEX idx_category_name ON categories(name);

-- Address indexes
CREATE INDEX idx_address_city_state ON addresses(city, state);

-- Event indexes
CREATE INDEX idx_event_organizer ON events(organizer_id);
CREATE INDEX idx_event_category ON events(category_id);
CREATE INDEX idx_event_start_time ON events(start_time);
CREATE INDEX idx_event_marketing ON events(marketing_enabled);

-- Ticket indexes
CREATE INDEX idx_ticket_event ON tickets(event_id);
CREATE INDEX idx_ticket_status ON tickets(ticket_status);
CREATE INDEX idx_ticket_type ON tickets(ticket_type);
CREATE INDEX idx_ticket_purchaser ON tickets(purchaser_id);

-- Cart indexes
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cart_ticket ON carts(ticket_id);

-- Order indexes
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_order_number ON orders(order_number);
CREATE INDEX idx_order_date ON orders(order_date);

-- OrderItem indexes
CREATE INDEX idx_order_item_order ON order_items(order_id);
CREATE INDEX idx_order_item_ticket ON order_items(ticket_id);

-- Payment indexes
CREATE INDEX idx_payment_order ON payments(order_id);
CREATE INDEX idx_payment_status ON payments(status);
CREATE INDEX idx_payment_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payment_date ON payments(payment_date);

-- Notification indexes
CREATE INDEX idx_notification_type ON notifications(type);
CREATE INDEX idx_notification_delivery ON notifications(delivery_type);

-- UserNotification indexes
CREATE INDEX idx_user_notification_user ON user_notifications(user_id);
CREATE INDEX idx_user_notification_status ON user_notifications(status);
CREATE INDEX idx_user_notification_created ON user_notifications(created_at);

-- NotificationPreference index (unique index already created via unique constraint)
-- idx_notification_preference_user is handled by unique constraint
