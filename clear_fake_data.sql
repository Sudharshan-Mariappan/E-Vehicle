-- ============================================================
-- LIVE DATABASE CLEANUP SCRIPT
-- Run this ONCE in your PostgreSQL client (psql or pgAdmin)
-- to remove all fake/sample station data.
-- ============================================================

-- Step 1: Cancel any active queue entries (so FK constraints are satisfied)
UPDATE queue SET status = 'cancelled' WHERE station_id IN (
    SELECT id FROM stations
);

-- Step 2: Cancel any active bookings
UPDATE bookings SET status = 'cancelled' WHERE station_id IN (
    SELECT id FROM stations
);

-- Step 3: Remove all fake queue entries
DELETE FROM queue;

-- Step 4: Remove all fake bookings
DELETE FROM bookings;

-- Step 5: Remove all fake reviews
DELETE FROM reviews;

-- Step 6: Remove all fake favorites
DELETE FROM favorites;

-- Step 7: Remove all fake slots
DELETE FROM slots;

-- Step 8: Remove all fake stations
DELETE FROM stations;

-- Step 9: Fix the queue UNIQUE constraint (drop old one, add partial index instead)
-- This allows users to rejoin a queue after cancelling.
ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_user_id_station_id_status_key;
DROP INDEX IF EXISTS idx_queue_unique_waiting;
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_unique_waiting
    ON queue (user_id, station_id)
    WHERE status = 'waiting';

-- Step 10: Reset ID sequences so new stations start from 1
ALTER SEQUENCE IF EXISTS stations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS slots_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS queue_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS favorites_id_seq RESTART WITH 1;

-- Done! Now only add REAL stations through the Admin Dashboard.
SELECT 'Cleanup complete. Stations: ' || COUNT(*) || ' remaining.' AS result FROM stations;
