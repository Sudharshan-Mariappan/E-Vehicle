const { query } = require('../config/db');

/**
 * GET /api/analytics
 * (Admin Only) Get system statistics.
 */
const getStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = '';
        let params = [];

        if (startDate && endDate) {
            dateFilter = ` AND created_at BETWEEN $1 AND $2`;
            params = [startDate, endDate];
        } else if (startDate) {
            dateFilter = ` AND created_at >= $1`;
            params = [startDate];
        }

        // 1. Total Users (Fixed count, usually not date-filtered for total summary)
        const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']);
        const totalUsers = parseInt(usersResult.rows[0].count);

        // 2. Total Bookings (Filtered)
        const bookingsResult = await query(`SELECT COUNT(*) as count FROM bookings WHERE 1=1${dateFilter}`, params);
        const totalBookings = parseInt(bookingsResult.rows[0].count);

        // 3. Total Revenue (Filtered)
        const revenueResult = await query(`SELECT SUM(total_cost) as total FROM bookings WHERE status = $1${dateFilter}`, ['completed', ...params]);
        const totalRevenue = parseFloat(revenueResult.rows[0].total || 0);

        // 4. Total Stations
        const stationsCountResult = await query("SELECT COUNT(*) as count FROM stations WHERE status = 'active'");
        const totalStations = parseInt(stationsCountResult.rows[0].count);

        // 5. Average Revenue per Booking (Filtered)
        const avgRevenueResult = await query(
            `SELECT AVG(total_cost) as avg FROM bookings WHERE status = 'completed' AND total_cost > 0${dateFilter}`,
            ['completed', ...params]
        );
        const avgRevenue = parseFloat(avgRevenueResult.rows[0].avg || 0);

        // 6. Bookings per Station (Top 5, Filtered)
        const stationStatsResult = await query(`
            SELECT s.name, COUNT(b.id) as count
            FROM bookings b
            JOIN stations s ON b.station_id = s.id
            WHERE 1=1${dateFilter.replace('created_at', 'b.created_at')}
            GROUP BY s.id, s.name
            ORDER BY count DESC
            LIMIT 5
        `, params);

        // 7. Booking Status Distribution (Filtered)
        const statusResult = await query(`
            SELECT status, COUNT(*) as count
            FROM bookings
            WHERE 1=1${dateFilter}
            GROUP BY status
        `, params);

        // 8. Daily Bookings Trend (Filtered or default 7 days)
        let trendInterval = startDate ? `created_at >= $1` : `created_at >= NOW() - INTERVAL '7 days'`;
        if (startDate && endDate) trendInterval = `created_at BETWEEN $1 AND $2`;

        const dailyTrendResult = await query(`
            SELECT
                TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS day,
                COUNT(*) AS count,
                COALESCE(SUM(total_cost), 0) AS revenue
            FROM bookings
            WHERE ${trendInterval}
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at) ASC
        `, params);

        // 9. Station Detailed Performance (New)
        const stationPerformanceResult = await query(`
            SELECT 
                s.id, 
                s.name, 
                s.city,
                COUNT(b.id) as sessions,
                COALESCE(SUM(b.total_cost), 0) as revenue,
                COALESCE(AVG(b.total_cost), 0) as avg_revenue
            FROM stations s
            LEFT JOIN bookings b ON s.id = b.station_id ${dateFilter.replace('created_at', 'b.created_at')}
            WHERE s.status = 'active'
            GROUP BY s.id, s.name, s.city
            ORDER BY revenue DESC
        `, params);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalBookings,
                totalRevenue,
                totalStations,
                avgRevenue,
                stationStats: stationStatsResult.rows,
                bookingStatus: statusResult.rows,
                dailyTrend: dailyTrendResult.rows,
                stationPerformance: stationPerformanceResult.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getStats };
