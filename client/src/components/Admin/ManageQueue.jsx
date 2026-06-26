import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Admin Queue Management
 * Shows all currently waiting queue entries across all stations.
 */
const ManageQueue = () => {
    const [queueEntries, setQueueEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchQueue = async () => {
        try {
            const { data } = await api.get('/queue/admin/all');
            setQueueEntries(data.entries || []);
        } catch (err) {
            toast.error('Failed to load queue data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleRemove = async (entryId) => {
        if (!window.confirm('Remove this user from the queue?')) return;
        try {
            await api.delete(`/queue/${entryId}`);
            setQueueEntries(prev => prev.filter(e => e.id !== entryId));
            toast.success('Removed from queue');
        } catch (err) {
            toast.error('Failed to remove from queue');
        }
    };

    const filtered = queueEntries.filter(e =>
        !search ||
        e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.station_name?.toLowerCase().includes(search.toLowerCase())
    );

    // Group by station
    const byStation = filtered.reduce((acc, e) => {
        if (!acc[e.station_id]) acc[e.station_id] = { name: e.station_name, entries: [] };
        acc[e.station_id].entries.push(e);
        return acc;
    }, {});

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Waiting</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--warning)' }}>{queueEntries.length}</div>
                </div>
                <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stations</div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>{Object.keys(byStation).length}</div>
                </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                <input
                    className="input-field"
                    placeholder="Search user or station..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '2rem' }}
                />
            </div>

            {loading ? (
                <div className="spinner" style={{ margin: '2rem auto' }} />
            ) : queueEntries.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-users" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '1rem', color: 'var(--warning)' }} />
                    <p>No users currently in queue</p>
                </div>
            ) : (
                Object.values(byStation).map(group => (
                    <div key={group.name} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <i className="fas fa-charging-station" style={{ color: 'var(--primary)', fontSize: '0.8rem' }} />
                            {group.name}
                            <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>{group.entries.length} waiting</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {group.entries.sort((a, b) => a.position - b.position).map(entry => (
                                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fbbf24', flexShrink: 0 }}>
                                        {entry.position}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user_name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            <i className="fas fa-clock" style={{ marginRight: '3px' }} />
                                            {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-xs btn-ghost"
                                        style={{ color: 'var(--danger)', flexShrink: 0 }}
                                        onClick={() => handleRemove(entry.id)}
                                        title="Remove from queue"
                                    >
                                        <i className="fas fa-times" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ManageQueue;
