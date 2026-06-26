import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useSocket from '../../hooks/useSocket';

/**
 * QueueView — Shows user's current queue positions across all stations.
 */
const QueueView = ({ onBack }) => {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQueues = async () => {
        try {
            const { data } = await api.get('/queue/my-queues');
            setQueues(data.queues || []);
        } catch (err) {
            // Endpoint may not exist yet — graceful fallback
            setQueues([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueues();
    }, []);

    useSocket('queue_position_updated', fetchQueues);
    useSocket('slot_assigned', fetchQueues);

    const handleLeaveQueue = async (stationId) => {
        try {
            await api.delete(`/queue/${stationId}/leave`);
            toast.success('Left queue');
            setQueues(prev => prev.filter(q => q.station_id !== stationId));
        } catch (err) {
            toast.error('Failed to leave queue');
        }
    };

    return (
        <div className="sidebar-content">
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={onBack}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <i className="fas fa-users" style={{ color: 'var(--warning)' }} />
                    <span style={{ fontWeight: 700 }}>My Queue Positions</span>
                    {queues.length > 0 && (
                        <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>{queues.length}</span>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {loading ? (
                    <div className="spinner" style={{ margin: '2rem auto' }} />
                ) : queues.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-users" style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '1rem', color: 'var(--warning)' }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Not in any queue</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            When all slots at a station are full, you can join the queue to be auto-assigned.
                        </p>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }} onClick={onBack}>
                            <i className="fas fa-search" style={{ marginRight: '0.5rem' }} />
                            Browse Stations
                        </button>
                    </div>
                ) : (
                    queues.map(q => (
                        <div key={q.station_id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{q.station_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }} />
                                        {q.city}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleLeaveQueue(q.station_id)}
                                    title="Leave queue"
                                >
                                    <i className="fas fa-times" style={{ marginRight: '4px' }} />
                                    Leave
                                </button>
                            </div>

                            {/* Position display */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(251,191,36,0.06)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>#{q.position}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        {q.position === 1 ? '🎉 You\'re next! A slot will be assigned soon.' : `${q.position - 1} person${q.position > 2 ? 's' : ''} ahead of you`}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                                        <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                                        Joined {new Date(q.joined_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default QueueView;
