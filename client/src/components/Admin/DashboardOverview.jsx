import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * DashboardOverview — Admin landing page
 * Shows quick stats, recent bookings, and recent users.
 */
const DashboardOverview = () => {
    const [stats, setStats] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [analyticsRes, bookingsRes, usersRes] = await Promise.all([
                    api.get('/analytics'),
                    api.get('/bookings/all'),
                    api.get('/auth/users'),
                ]);
                setStats(analyticsRes.data.stats);
                setRecentBookings((bookingsRes.data.bookings || []).slice(0, 5));
                setRecentUsers((usersRes.data.users || []).slice(0, 5));
            } catch (err) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return <div className="spinner" style={{ margin: '3rem auto' }} />;
    if (!stats) return null;

    const quickStats = [
        { label: 'Total Revenue', value: `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`, icon: 'fa-indian-rupee-sign', color: 'var(--success)', bg: 'rgba(34,197,94,0.1)' },
        { label: 'Total Bookings', value: stats.totalBookings, icon: 'fa-calendar-check', color: 'var(--primary)', bg: 'rgba(0,212,170,0.1)' },
        { label: 'Total Users', value: stats.totalUsers, icon: 'fa-users', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
        { label: 'Active Stations', value: stats.totalStations, icon: 'fa-charging-station', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    ];

    const statusColor = { completed: 'var(--success)', active: 'var(--warning)', cancelled: 'var(--danger)' };

    return (
        <div>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {quickStats.map(s => (
                    <div key={s.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={`fas ${s.icon}`} style={{ fontSize: '1.1rem', color: s.color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{s.label}</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Recent Bookings */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fas fa-calendar-check" style={{ color: 'var(--primary)' }} />
                        Recent Bookings
                    </div>
                    {recentBookings.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No bookings yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {recentBookings.map(b => (
                                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{b.user_name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.station_name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="badge" style={{ background: `${statusColor[b.status]}20`, color: statusColor[b.status], fontSize: '0.65rem' }}>
                                            {b.status}
                                        </span>
                                        {b.total_cost && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '2px' }}>₹{parseFloat(b.total_cost).toFixed(2)}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Users */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fas fa-users" style={{ color: '#a78bfa' }} />
                        Recent Users
                    </div>
                    {recentUsers.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No users yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {recentUsers.map(u => {
                                const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                            {initials}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                        </div>
                                        <span className={`badge badge-${u.role === 'admin' ? 'warning' : 'primary'}`} style={{ fontSize: '0.6rem', flexShrink: 0 }}>
                                            {u.role}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
