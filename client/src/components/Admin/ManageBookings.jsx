import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/all');
            setBookings(data.bookings);
        } catch (err) {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await api.put(`/bookings/${bookingId}/cancel`);
            toast.success('Booking cancelled successfully');
            fetchBookings(); // Refresh list
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to cancel booking');
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesStatus = filter === 'all' || b.status === filter;
            const matchesSearch = !search ||
                b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
                b.user_email?.toLowerCase().includes(search.toLowerCase()) ||
                b.station_name?.toLowerCase().includes(search.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [bookings, filter, search]);

    const handleExportCSV = () => {
        if (filteredBookings.length === 0) return toast.error('No bookings to export');
        const headers = ['ID', 'User', 'Email', 'Station', 'Slot', 'Status', 'Date', 'Cost (₹)'];
        const rows = filteredBookings.map(b => [
            b.id,
            `"${b.user_name}"`,
            b.user_email,
            `"${b.station_name}"`,
            `"${b.slot_name}"`,
            b.status,
            new Date(b.created_at).toLocaleString(),
            b.total_cost || '0'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Bookings exported!');
    };

    const getStatusBadge = (status) => {
        const map = { completed: 'badge-success', active: 'badge-primary', cancelled: 'badge-danger' };
        return map[status] || '';
    };

    // Quick stats
    const stats = useMemo(() => ({
        total: bookings.length,
        active: bookings.filter(b => b.status === 'active').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + parseFloat(b.total_cost || 0), 0)
    }), [bookings]);

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                    { label: 'Total', value: stats.total, color: 'var(--text)' },
                    { label: 'Active', value: stats.active, color: 'var(--primary)' },
                    { label: 'Done', value: stats.completed, color: 'var(--success)' },
                    { label: 'Revenue', value: `₹${stats.revenue.toFixed(0)}`, color: 'var(--warning)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.6rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                    <input
                        className="input-field"
                        placeholder="Search user, station..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2rem' }}
                    />
                </div>
                <select
                    className="input-field"
                    style={{ width: 'auto', minWidth: '110px' }}
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleExportCSV}
                    title="Export CSV"
                    style={{ color: 'var(--success)', flexShrink: 0 }}
                >
                    <i className="fas fa-download" />
                </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Showing {filteredBookings.length} of {bookings.length} bookings
            </div>

            {loading ? (
                <div className="spinner" />
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>ID</th>
                                <th style={{ padding: '0.75rem' }}>User</th>
                                <th style={{ padding: '0.75rem' }}>Station</th>
                                <th style={{ padding: '0.75rem' }}>Status</th>
                                <th style={{ padding: '0.75rem' }}>Date</th>
                                <th style={{ padding: '0.75rem' }}>Cost</th>
                                <th style={{ padding: '0.75rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No bookings match your search
                                    </td>
                                </tr>
                            ) : filteredBookings.map(booking => (
                                <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{booking.id}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div style={{ fontWeight: 500 }}>{booking.user_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{booking.user_email}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div>{booking.station_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{booking.slot_name}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span className={`badge ${getStatusBadge(booking.status)}`}
                                            style={!getStatusBadge(booking.status) ? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' } : {}}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                                        {new Date(booking.created_at).toLocaleDateString()}<br />
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            {new Date(booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', fontWeight: 600, color: booking.total_cost ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {booking.total_cost ? `₹${parseFloat(booking.total_cost).toFixed(2)}` : '—'}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {booking.status === 'active' && (
                                            <button
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => handleCancel(booking.id)}
                                                style={{ color: 'var(--danger)' }}
                                                title="Cancel Booking"
                                            >
                                                <i className="fas fa-times-circle" /> Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageBookings;
