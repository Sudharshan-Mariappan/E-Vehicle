-- ============================================================
-- EV Charging Station Queue Management System
-- PostgreSQL Database Schema v2.0
-- ============================================================
-- NO sample data is included. Only real stations added by
-- an admin through the application will appear on the map.
-- To add stations: log in as admin -> Admin Dashboard -> Manage Stations
-- ============================================================

-- Drop existing tables if re-running (order matters due to FK)
DROP TABLE IF EXISTS queue CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(15),
    vehicle_type    VARCHAR(50),   -- e.g. 'Two-Wheeler', 'Car', 'SUV'
    role            VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    wallet_balance  DECIMAL(10, 2) DEFAULT 0.00,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STATIONS TABLE
-- ============================================================
CREATE TABLE stations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         TEXT NOT NULL,
    latitude        DECIMAL(10, 8) NOT NULL,
    longitude       DECIMAL(11, 8) NOT NULL,
    city            VARCHAR(80) NOT NULL,
    district        VARCHAR(80) NOT NULL,
    state           VARCHAR(80) NOT NULL,
    local_area      VARCHAR(100),
    landmark        VARCHAR(150),
    pincode         VARCHAR(10),
    phone           VARCHAR(15),
    email           VARCHAR(150),
    rating          DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    price_per_kwh   DECIMAL(6, 2) NOT NULL,
    operating_hours VARCHAR(100) DEFAULT '24/7',
    amenities       JSONB DEFAULT '[]',       -- ["WiFi", "Restrooms", ...]
    connector_types JSONB DEFAULT '[]',       -- ["Type 2", "CCS", ...]
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SLOTS TABLE (individual charger slots per station)
-- ============================================================
CREATE TABLE slots (
    id              SERIAL PRIMARY KEY,
    station_id      INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    slot_name       VARCHAR(50) NOT NULL,          -- e.g. 'Slot A1', 'CCS-01'
    connector_type  VARCHAR(50) NOT NULL,           -- 'Type 2', 'CCS', 'CHAdeMO', etc.
    power_kw        DECIMAL(6, 2) NOT NULL,         -- Charging power in kW
    status          VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'offline')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id      INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    slot_id         INT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    start_time      TIMESTAMPTZ DEFAULT NOW(),
    end_time        TIMESTAMPTZ,
    energy_consumed DECIMAL(8, 3) DEFAULT 0.000,   -- kWh consumed
    total_cost      DECIMAL(8, 2) DEFAULT 0.00,     -- INR
    payment_status  VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id      VARCHAR(150),                   -- Razorpay payment ID
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUEUE TABLE
-- ============================================================
CREATE TABLE queue (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id      INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    position        INT NOT NULL,                   -- Queue position (1 = first in line)
    status          VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'cancelled', 'expired', 'offered')),
    assigned_slot_id INT REFERENCES slots(id) ON DELETE SET NULL,  -- Set when auto-assigned
    assigned_booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
    offer_expires_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one active (waiting) queue entry per user per station.
-- Users CAN rejoin after cancelling because the index only applies to 'waiting' rows.
CREATE UNIQUE INDEX idx_queue_unique_waiting
    ON queue (user_id, station_id)
    WHERE status = 'waiting';

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id  INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, station_id)  -- One review per user per station
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    message     TEXT NOT NULL,
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FAVORITES TABLE
-- ============================================================
CREATE TABLE favorites (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    station_id      INTEGER REFERENCES stations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, station_id)
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount          DECIMAL(10, 2) NOT NULL,
    type            VARCHAR(10) CHECK (type IN ('CREDIT', 'DEBIT')),
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_stations_location ON stations(latitude, longitude);
CREATE INDEX idx_stations_district ON stations(district);
CREATE INDEX idx_stations_state ON stations(state);
CREATE INDEX idx_stations_status ON stations(status);
CREATE INDEX idx_slots_station ON slots(station_id);
CREATE INDEX idx_slots_status ON slots(status);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_station ON bookings(station_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_queue_station ON queue(station_id);
CREATE INDEX idx_queue_user ON queue(user_id);
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_position ON queue(station_id, position);
CREATE INDEX idx_reviews_station ON reviews(station_id);

-- ============================================================
-- TRIGGER: auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_slots_updated_at BEFORE UPDATE ON slots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_queue_updated_at BEFORE UPDATE ON queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HOW TO ADD REAL STATIONS:
-- Log in to the application as an admin user, then go to
-- Admin Dashboard -> Station Management -> Add New Station
-- Enter REAL coordinates (latitude/longitude) from Google Maps.
-- Only stations with verified real locations should be added.
-- ============================================================
