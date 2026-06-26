import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Admin Reviews Management
 * Lists all reviews across all stations; allows admin to delete any review.
 */
const ManageReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState('');
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get('/stations/nearby', { params: { lat: 0, lng: 0, radius: 20000, includeAll: true } })
            .then(({ data }) => setStations(data.stations || []))
            .catch(() => { });
    }, []);

    // Fetch reviews when station selected
    const fetchReviews = async () => {
        if (!selectedStation) { setReviews([]); return; }
        setLoading(true);
        try {
            const { data } = await api.get(`/reviews/${selectedStation}`);
            setReviews(data.reviews || []);
        } catch (err) {
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [selectedStation]);

    const handleDelete = async (reviewId) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await api.delete(`/reviews/${reviewId}`);
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            toast.success('Review deleted');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete review');
        }
    };

    const handleReplySubmit = async (reviewId) => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            await api.put(`/reviews/${reviewId}/response`, { response: replyText });
            toast.success('Response saved');
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, admin_response: replyText } : r));
            setReplyingTo(null);
            setReplyText('');
        } catch (err) {
            toast.error('Failed to save response');
        } finally {
            setSubmitting(false);
        }
    };

    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <div>
            {/* ... station selector ... */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Select Station to View Reviews
                </label>
                <select
                    className="input-field"
                    value={selectedStation}
                    onChange={e => setSelectedStation(e.target.value)}
                >
                    <option value="">— Choose a station —</option>
                    {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            {selectedStation && reviews.length > 0 && (() => {
                const dist = [5, 4, 3, 2, 1].map(star => ({
                    star,
                    count: reviews.filter(r => r.rating === star).length,
                    pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100)
                }));
                return (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reviews</div>
                                <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{reviews.length}</div>
                            </div>
                            <div className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Rating</div>
                                <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#fbbf24' }}>
                                    ⭐ {avgRating}
                                </div>
                            </div>
                        </div>
                        {/* Rating distribution omitted for brevity in chunk but kept in file */}
                        <div className="card" style={{ padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Rating Distribution</div>
                            {dist.map(({ star, count, pct }) => (
                                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#fbbf24', width: '20px', textAlign: 'right', flexShrink: 0 }}>{star}★</span>
                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: star >= 4 ? 'var(--success)' : star === 3 ? 'var(--warning)' : 'var(--danger)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '28px', flexShrink: 0 }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Reviews List */}
            {loading && <div className="spinner" style={{ margin: '2rem auto' }} />}

            {!loading && selectedStation && reviews.length === 0 && (
                <div className="empty-state">
                    <i className="fas fa-star" style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }} />
                    <p>No reviews for this station yet.</p>
                </div>
            )}

            {!loading && reviews.map(review => (
                <div key={review.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem', borderLeft: review.admin_response ? '4px solid var(--primary)' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                <span style={{ fontWeight: 600 }}>{review.user_name}</span>
                                <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                                    {[...Array(5)].map((_, i) => (
                                        <i key={i} className={i < review.rating ? 'fas fa-star' : 'far fa-star'} style={{ marginRight: '2px' }} />
                                    ))}
                                </div>
                                {review.admin_response && (
                                    <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>Replied</span>
                                )}
                            </div>
                            {review.comment && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0' }}>
                                    "{review.comment}"
                                </p>
                            )}
                            {review.admin_response && (
                                <div style={{ margin: '0.5rem 0', padding: '0.5rem', background: 'rgba(0,212,170,0.05)', borderRadius: '6px', borderLeft: '2px solid var(--primary)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.2rem' }}>Admin Response:</div>
                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{review.admin_response}</div>
                                </div>
                            )}
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', display: 'flex', gap: '1rem' }}>
                                <span><i className="fas fa-clock" style={{ marginRight: '4px' }} />{new Date(review.created_at).toLocaleString()}</span>
                                {!review.admin_response && replyingTo !== review.id && (
                                    <button className="btn-link" style={{ color: 'var(--primary)', fontSize: '0.7rem' }} onClick={() => { setReplyingTo(review.id); setReplyText(''); }}>
                                        Reply
                                    </button>
                                )}
                                {review.admin_response && replyingTo !== review.id && (
                                    <button className="btn-link" style={{ color: 'var(--primary)', fontSize: '0.7rem' }} onClick={() => { setReplyingTo(review.id); setReplyText(review.admin_response); }}>
                                        Edit Reply
                                    </button>
                                )}
                            </div>

                            {replyingTo === review.id && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <textarea
                                        className="form-input"
                                        placeholder="Write your response..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        rows={2}
                                        style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-primary btn-xs" onClick={() => handleReplySubmit(review.id)} disabled={submitting}>
                                            {submitting ? 'Saving...' : 'Save Response'}
                                        </button>
                                        <button className="btn btn-ghost btn-xs" onClick={() => setReplyingTo(null)}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-ghost btn-xs"
                            style={{ color: 'var(--danger)', marginLeft: '0.75rem', flexShrink: 0 }}
                            onClick={() => handleDelete(review.id)}
                            title="Delete review"
                        >
                            <i className="fas fa-trash" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ManageReviews;
