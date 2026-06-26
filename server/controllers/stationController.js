const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/stations
 * Returns all active stations with slot availability counts.
 * No distance filter — shows every station in the system.
 */
const getAllStations = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT s.*,
         COUNT(sl.id)                                         AS total_slots,
         COUNT(sl.id) FILTER (WHERE sl.status = 'available') AS available_slots
       FROM stations s
       LEFT JOIN slots sl ON sl.station_id = s.id
       WHERE s.status = 'active'
       GROUP BY s.id
       ORDER BY s.rating DESC, s.name ASC`
        );

        res.json({ success: true, count: result.rows.length, stations: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/stations/nearby?lat=&lng=&radius=
 * Returns stations within the given radius (km) using the Haversine formula.
 * Also returns slot availability counts per station.
 */
const getNearbyStations = async (req, res, next) => {
    try {
        const { lat, lng, radius, includeAll } = req.query;
        const statusClause = includeAll === 'true' ? '' : "AND s.status = 'active'";

        // Haversine formula in PostgreSQL
        const result = await query(
            `SELECT
          s.*,
          COUNT(sl.id)                                                   AS total_slots,
          COUNT(sl.id) FILTER (WHERE sl.status = 'available')           AS available_slots,
          (6371 * acos(
            LEAST(1.0, cos(radians($1)) * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians($2))
            + sin(radians($1)) * sin(radians(s.latitude)))
          )) AS distance_km
        FROM stations s
        LEFT JOIN slots sl ON sl.station_id = s.id
        WHERE 1=1 ${statusClause}
        GROUP BY s.id
        HAVING (6371 * acos(
          LEAST(1.0, cos(radians($1)) * cos(radians(s.latitude))
          * cos(radians(s.longitude) - radians($2))
          + sin(radians($1)) * sin(radians(s.latitude)))
        )) < $3
        ORDER BY distance_km ASC`,
            [lat, lng, radius]
        );

        res.json({ success: true, count: result.rows.length, stations: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/stations/:id
 * Returns full station details including all slots with their current status.
 */
const getStationById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch station
        const stationResult = await query(
            `SELECT s.*,
         COUNT(sl.id)                                         AS total_slots,
         COUNT(sl.id) FILTER (WHERE sl.status = 'available') AS available_slots
       FROM stations s
       LEFT JOIN slots sl ON sl.station_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
            [id]
        );

        if (stationResult.rows.length === 0) {
            return next(new AppError('Station not found.', 404));
        }

        // Fetch all slots for this station
        const slotsResult = await query(
            `SELECT id, slot_name, connector_type, power_kw, status
       FROM slots
       WHERE station_id = $1
       ORDER BY slot_name`,
            [id]
        );

        // Fetch current queue length for this station
        const queueResult = await query(
            `SELECT COUNT(*) AS queue_length
       FROM queue
       WHERE station_id = $1 AND status = 'waiting'`,
            [id]
        );

        res.json({
            success: true,
            station: stationResult.rows[0],
            slots: slotsResult.rows,
            queue_length: parseInt(queueResult.rows[0].queue_length),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/stations/search?query=&state=&district=&local_area=
 * Search/filter stations by name, state, district, or local area.
 */
const searchStations = async (req, res, next) => {
    try {
        const { query: searchQuery, state, district, local_area } = req.query;

        const conditions = [`s.status = 'active'`];
        const params = [];
        let paramIndex = 1;

        if (state) {
            conditions.push(`s.state ILIKE $${paramIndex++}`);
            params.push(`%${state}%`);
        }
        if (district) {
            conditions.push(`s.district ILIKE $${paramIndex++}`);
            params.push(`%${district}%`);
        }
        if (local_area) {
            conditions.push(`(s.local_area ILIKE $${paramIndex} OR s.landmark ILIKE $${paramIndex} OR s.address ILIKE $${paramIndex})`);
            params.push(`%${local_area}%`);
            paramIndex++;
        }
        if (searchQuery) {
            conditions.push(`(s.name ILIKE $${paramIndex} OR s.local_area ILIKE $${paramIndex} OR s.landmark ILIKE $${paramIndex} OR s.address ILIKE $${paramIndex})`);
            params.push(`%${searchQuery}%`);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        const result = await query(
            `SELECT s.*,
         COUNT(sl.id)                                         AS total_slots,
         COUNT(sl.id) FILTER (WHERE sl.status = 'available') AS available_slots
       FROM stations s
       LEFT JOIN slots sl ON sl.station_id = s.id
       WHERE ${whereClause}
       GROUP BY s.id
       ORDER BY s.rating DESC, available_slots DESC`,
            params
        );

        res.json({ success: true, count: result.rows.length, stations: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/stations/districts
 * Returns distinct districts with station counts.
 */
const getDistricts = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT DISTINCT district, state, COUNT(*) AS station_count
       FROM stations
       WHERE status = 'active'
       GROUP BY district, state
       ORDER BY state, district`
        );
        res.json({ success: true, districts: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/stations
 * (Admin only) Create a new station.
 */
const createStation = async (req, res, next) => {
    try {
        const {
            name, address, latitude, longitude, city, district, state,
            local_area, landmark, pincode, phone, email, price_per_kwh,
            operating_hours, amenities, connector_types
        } = req.body;

        const result = await query(
            `INSERT INTO stations (
                name, address, latitude, longitude, city, district, state,
                local_area, landmark, pincode, phone, email, price_per_kwh,
                operating_hours, amenities, connector_types
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`,
            [
                name, address, latitude, longitude, city, district, state,
                local_area, landmark, pincode, phone, email, price_per_kwh,
                operating_hours || '24/7',
                JSON.stringify(amenities || []),
                JSON.stringify(connector_types || [])
            ]
        );

        res.status(201).json({ success: true, station: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/stations/:id
 * (Admin only) Update station details.
 */
const updateStation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Dynamic update query builder
        const keys = Object.keys(updates).filter(k => k !== 'id' && updates[k] !== undefined);
        if (keys.length === 0) return res.json({ success: true, message: 'No updates provided' });

        const setClause = keys.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
        const values = keys.map(key => {
            if (key === 'amenities' || key === 'connector_types') return JSON.stringify(updates[key]);
            return updates[key];
        });

        const result = await query(
            `UPDATE stations SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );

        if (result.rows.length === 0) return next(new AppError('Station not found', 404));

        res.json({ success: true, station: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/stations/:id
 * (Admin only) Delete a station.
 */
const deleteStation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM stations WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) return next(new AppError('Station not found', 404));

        res.json({ success: true, message: 'Station deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/stations/:id/slots
 * (Admin only) Add a slot to a station.
 */
const addSlot = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { slot_name, connector_type, power_kw } = req.body;

        const result = await query(
            `INSERT INTO slots (station_id, slot_name, connector_type, power_kw, status)
             VALUES ($1, $2, $3, $4, 'available')
             RETURNING *`,
            [id, slot_name, connector_type, power_kw]
        );

        res.status(201).json({ success: true, slot: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/stations/:id/slots/:slotId
 * (Admin only) Delete a slot from a station.
 */
const deleteSlot = async (req, res, next) => {
    try {
        const { id, slotId } = req.params;
        const result = await query(
            'DELETE FROM slots WHERE id = $1 AND station_id = $2 RETURNING id',
            [slotId, id]
        );
        if (result.rows.length === 0) return next(new AppError('Slot not found', 404));
        res.json({ success: true, message: 'Slot deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/stations/:id/slots/:slotId
 * (Admin only) Update a slot's status or details.
 */
const updateSlotStatus = async (req, res, next) => {
    try {
        const { id, slotId } = req.params;
        const { status } = req.body;

        const result = await query(
            'UPDATE slots SET status = $1 WHERE id = $2 AND station_id = $3 RETURNING *',
            [status, slotId, id]
        );
        if (result.rows.length === 0) return next(new AppError('Slot not found', 404));
        res.json({ success: true, slot: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/stations/:id/status
 * (Admin only) Toggle station status between 'active' and 'maintenance'.
 */
const toggleStationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'maintenance'].includes(status)) {
            return next(new AppError('Invalid status. Use active or maintenance.', 400));
        }

        // 1. Update station status
        const stationResult = await query(
            'UPDATE stations SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (stationResult.rows.length === 0) return next(new AppError('Station not found', 404));

        // 2. Update all slots for this station (if status is maintenance, mark all slots same)
        if (status === 'maintenance') {
            await query("UPDATE slots SET status = 'maintenance' WHERE station_id = $1", [id]);
        } else {
            // Restore slots to available (if they were in maintenance)
            await query("UPDATE slots SET status = 'available' WHERE station_id = $1 AND status = 'maintenance'", [id]);
        }

        res.json({ success: true, station: stationResult.rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllStations,
    getNearbyStations,
    getStationById,
    searchStations,
    getDistricts,
    createStation,
    updateStation,
    deleteStation,
    addSlot,
    deleteSlot,
    updateSlotStatus,
    toggleStationStatus
};
