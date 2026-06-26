import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ReceiptView from './ReceiptView';
import { useAuth } from '../../context/AuthContext';

const SessionHistory = ({ onBack }) => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/sessions/history');
                setSessions(data.sessions);
            } catch (err) {
                toast.error('Failed to load session history');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Filtered sessions
    const filtered = sessions.filter(s => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (dateFrom) {
            const from = new Date(dateFrom);
            if (new Date(s.start_time) < from) return false;
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (new Date(s.start_time) > to) return false;
        }
        return true;
    });

    // CSV Export
    const handleExportCSV = () => {
        if (filtered.length === 0) return toast.error('No sessions to export');

        const headers = ['Station', 'Address', 'Slot', 'Connector', 'Status', 'Start Time', 'End Time', 'Energy (kWh)', 'Cost (₹)'];
        const rows = filtered.map(s => [
            `"${s.station_name}"`,
            `"${s.address}"`,
            `"${s.slot_name}"`,
            `"${s.connector_type}"`,
            s.status,
            new Date(s.start_time).toLocaleString(),
            s.end_time ? new Date(s.end_time).toLocaleString() : '-',
            s.energy_consumed ? parseFloat(s.energy_consumed).toFixed(3) : '0.000',
            s.total_cost ? parseFloat(s.total_cost).toFixed(2) : '0.00'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ev-charging-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Session history exported!');
    };

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setStatusFilter('all');
    };

    const hasFilters = dateFrom || dateTo || statusFilter !== 'all';

    // Summary stats (from filtered)
    const completedSessions = filtered.filter(s => s.status === 'completed');
    const totalEnergy = completedSessions.reduce((sum, s) => sum + parseFloat(s.energy_consumed || 0), 0);
    const totalSpent = completedSessions.reduce((sum, s) => sum + parseFloat(s.total_cost || 0), 0);

    if (loading) {
        return (
            <div className="sidebar-content p-4">
                <div className="spinner" style={{ margin: '2rem auto', color: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div className="sidebar-content">
            {/* Header */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={onBack}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <h3 style={{ flex: 1, margin: 0 }}>Charging History</h3>
                    {filtered.length > 0 && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleExportCSV}
                            title="Export as CSV"
                            style={{ color: 'var(--success)' }}
                        >
                            <i className="fas fa-download" style={{ marginRight: '0.4rem' }} />
                            CSV
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>From</label>
                        <input
                            type="date"
                            className="input-field"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>To</label>
                        <input
                            type="date"
                            className="input-field"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                        className="input-field"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', flex: 1 }}
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    {hasFilters && (
                        <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Clear filters">
                            <i className="fas fa-times" />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            {filtered.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div className="card" style={{ padding: '0.6rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sessions</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{filtered.length}</div>
                    </div>
                    <div className="card" style={{ padding: '0.6rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Energy</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                            {totalEnergy.toFixed(1)} kWh
                        </div>
                    </div>
                    <div className="card" style={{ padding: '0.6rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Spent</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>
                            ₹{totalSpent.toFixed(0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Session List */}
            <div className="station-list" style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
                        <p>{hasFilters ? 'No sessions match your filters.' : 'No past charging sessions found.'}</p>
                        {hasFilters && (
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    filtered.map((session) => (
                        <div key={session.id} className="station-card" style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 600 }}>{session.station_name}</div>
                                <span className={`badge ${session.status === 'completed' ? 'badge-success' : session.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                                    {session.status}
                                </span>
                            </div>
                            <div className="info-row">
                                <i className="fas fa-map-marker-alt" /> {session.address}
                            </div>
                            <div className="info-row">
                                <i className="fas fa-bolt" /> {session.slot_name} ({session.connector_type})
                            </div>
                            <div className="info-row">
                                <i className="fas fa-clock" /> {new Date(session.start_time).toLocaleString()}
                            </div>
                            {session.end_time && (
                                <div className="info-row">
                                    <i className="fas fa-hourglass-end" /> {new Date(session.end_time).toLocaleString()}
                                </div>
                            )}
                            {session.status === 'completed' && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
                                    {parseFloat(session.energy_consumed) > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                                            <i className="fas fa-bolt" style={{ marginRight: '4px' }} />
                                            {parseFloat(session.energy_consumed).toFixed(3)} kWh
                                        </div>
                                    )}
                                    {parseFloat(session.total_cost) > 0 && (
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                                            Total: ₹{parseFloat(session.total_cost).toFixed(2)}
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => ReceiptView.print(session, user)}
                                        title="Download Receipt"
                                        style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '0.72rem' }}
                                    >
                                        <i className="fas fa-receipt" style={{ marginRight: '3px' }} />
                                        Receipt
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SessionHistory;
