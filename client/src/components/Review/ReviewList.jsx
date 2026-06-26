import { useState, useEffect } from 'react';
import api from '../../services/api';

const StarRating = ({ rating, max = 5 }) => (
    <div style={{ display: 'inline-flex', gap: '2px', color: '#fbbf24', fontSize: '0.85rem' }}>
        {[...Array(max)].map((_, i) => (
            <i key={i} className={i < Math.round(rating) ? 'fas fa-star' : 'far fa-star'} />
        ))}
    </div>
);

const ReviewList = ({ stationId, refreshTrigger }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/reviews/${stationId}`);
                setReviews(data.reviews);
            } catch (err) {
                console.error('Failed to load reviews', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, [stationId, refreshTrigger]);

    if (loading) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', color: 'var(--primary)' }} />
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <i className="far fa-star" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} />
                No reviews yet. Be the first to review!
            </div>
        );
    }

    // Compute average
    const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

    return (
        <div style={{ padding: '0 1rem' }}>
            {/* Summary bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '10px',
                marginBottom: '1rem'
            }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{avg}</div>
                <div>
                    <StarRating rating={parseFloat(avg)} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Individual reviews */}
            {reviews.map((review) => (
                <div key={review.id} style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '28px', height: '28px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), #60a5fa)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, color: '#000', flexShrink: 0
                            }}>
                                {review.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{review.user_name}</span>
                        </div>
                        <StarRating rating={review.rating} />
                    </div>
                    {review.comment && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', lineHeight: 1.5 }}>
                            {review.comment}
                        </p>
                    )}
                    {review.admin_response && (
                        <div style={{
                            margin: '0.5rem 0 0.5rem 1rem',
                            padding: '0.6rem',
                            background: 'rgba(0,212,170,0.06)',
                            border: '1px solid rgba(0,212,170,0.15)',
                            borderRadius: '8px',
                            position: 'relative',
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: '-1rem',
                                top: '0.5rem',
                                color: 'rgba(0,212,170,0.3)',
                                fontSize: '0.8rem'
                            }}>
                                <i className="fas fa-reply fa-rotate-180" />
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                                Provider Response:
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                {review.admin_response}
                            </div>
                        </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                        <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewList;
