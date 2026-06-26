import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AddReview = ({ stationId, onReviewAdded, onCancel }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/reviews', { stationId, rating, comment });
            toast.success('Review added successfully!');
            onReviewAdded();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Write a Review</h4>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <i
                        key={star}
                        className={`fas fa-star ${star <= rating ? 'active' : ''}`}
                        style={{
                            cursor: 'pointer',
                            color: star <= rating ? '#fbbf24' : 'var(--text-muted)',
                            fontSize: '1.2rem'
                        }}
                        onClick={() => setRating(star)}
                    />
                ))}
            </div>

            <textarea
                className="input-field"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: '100%', minHeight: '80px', marginBottom: '0.5rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={submitting}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Post Review'}
                </button>
            </div>
        </form>
    );
};

export default AddReview;
