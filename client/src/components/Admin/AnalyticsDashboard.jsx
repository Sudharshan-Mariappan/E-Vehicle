import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../../services/api';
import toast from 'react-hot-toast';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, month, custom

    const fetchStats = async () => {
        setLoading(true);
        try {
            let params = {};
            if (dateRange === '7d') {
                params.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (dateRange === '30d') {
                params.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            } else if (dateRange === 'month') {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                params.startDate = startOfMonth.toISOString();
            }

            const { data } = await api.get('/analytics', { params });
            setStats(data.stats);
        } catch (err) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    if (!stats && loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
        </div>
    );
    if (!stats) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>No data available</div>;

    // ... (rest of data prep remains similar but uses new stats)
    const stationData = {
        labels: stats.stationStats.map(s => s.name.length > 15 ? s.name.substring(0, 15) + '…' : s.name),
        datasets: [
            {
                label: 'Bookings',
                data: stats.stationStats.map(s => s.count),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 6,
            },
        ],
    };

    const statusData = {
        labels: stats.bookingStatus.map(s => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
        datasets: [
            {
                data: stats.bookingStatus.map(s => s.count),
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(251, 191, 36, 1)',
                ],
                borderWidth: 2,
            },
        ],
    };

    const trendData = {
        labels: stats.dailyTrend.length > 0 ? stats.dailyTrend.map(d => d.day) : ['No Data'],
        datasets: [
            {
                label: 'Bookings',
                data: stats.dailyTrend.length > 0 ? stats.dailyTrend.map(d => parseInt(d.count)) : [0],
                borderColor: 'rgba(0, 212, 170, 1)',
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(0, 212, 170, 1)',
                pointRadius: 4,
            },
            {
                label: 'Revenue (₹)',
                data: stats.dailyTrend.length > 0 ? stats.dailyTrend.map(d => parseFloat(d.revenue)) : [0],
                borderColor: 'rgba(251, 191, 36, 1)',
                backgroundColor: 'rgba(251, 191, 36, 0.05)',
                fill: false,
                tension: 0.4,
                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                pointRadius: 4,
                yAxisID: 'y1',
            },
        ],
    };

    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
    };

    const summaryCards = [
        { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: 'fa-indian-rupee-sign', color: 'var(--success)' },
        { label: 'Bookings', value: stats.totalBookings, icon: 'fa-calendar-check', color: 'var(--primary)' },
        { label: 'Avg/Booking', value: `₹${stats.avgRevenue.toFixed(0)}`, icon: 'fa-chart-line', color: '#a78bfa' },
        { label: 'Sessions', value: stats.totalBookings, icon: 'fa-bolt', color: '#fb923c' },
    ];

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header & Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Performance</h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
                    {[
                        { id: '7d', label: '7 Days' },
                        { id: '30d', label: '30 Days' },
                        { id: 'month', label: 'This Month' },
                        { id: 'all', label: 'Lifetime' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            className={`btn btn-xs ${dateRange === btn.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setDateRange(btn.id)}
                            disabled={loading}
                        >
                            {btn.label}
                        </button>
                    ))}
                    <button className="btn btn-ghost btn-xs" onClick={fetchStats} disabled={loading}>
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {summaryCards.map(card => (
                    <div key={card.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{card.label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Daily Trend</h3>
                    <div style={{ height: '220px' }}>
                        {loading ? <div className="spinner" style={{ margin: '3rem auto' }} /> : <Line data={trendData} options={{ ...chartDefaults, ...{ scales: { y: { ...chartDefaults.scales.y, title: { display: true, text: 'Bookings' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#fbbf24' } } } } }} />}
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Top Stations</h3>
                    <div style={{ height: '250px' }}>
                        {loading ? <div className="spinner" style={{ margin: '3rem auto' }} /> : <Bar data={stationData} options={{ ...chartDefaults, plugins: { legend: { display: false } } }} />}
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Status Mix</h3>
                    <div style={{ height: '250px' }}>
                        {loading ? <div className="spinner" style={{ margin: '3rem auto' }} /> : <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } } }} />}
                    </div>
                </div>
            </div>

            {/* Station Performance Table */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-list" style={{ marginRight: '0.5rem' }} />
                    Station Performance Breakdown
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Station</th>
                                <th style={{ padding: '0.75rem' }}>City</th>
                                <th style={{ padding: '0.75rem' }}>Sessions</th>
                                <th style={{ padding: '0.75rem' }}>Revenue</th>
                                <th style={{ padding: '0.75rem' }}>Avg/Session</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.stationPerformance?.map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{s.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{s.city}</td>
                                    <td style={{ padding: '0.75rem' }}>{s.sessions}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--success)' }}>₹{parseFloat(s.revenue).toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--primary)' }}>₹{parseFloat(s.avg_revenue).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
