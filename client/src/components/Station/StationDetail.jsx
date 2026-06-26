import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useSocket from '../../hooks/useSocket';
import ReviewList from '../Review/ReviewList';
import AddReview from '../Review/AddReview';
import CostEstimator from '../Booking/CostEstimator';

/**
 * StationDetail component
 * Shows full station info, all slots, and booking/queue actions.
 * Subscribes to real-time slot status changes for this station.
 */
const StationDetail = ({ station, onClose, onBookingCreated, isFavorite, onToggleFavorite, onGetDirections, directionsInfo }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [queueLoading, setQueueLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Fetch full station details including slots
    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/stations/${station.id}`);
            setDetail(data);
        } catch (err) {
            toast.error('Failed to load station details');
        } finally {
            setLoading(false);
        }
    }, [station.id]);

    const fetchQueueStatus = useCallback(async () => {
        try {
            const { data } = await api.get(`/queue/${station.id}/status`);
            if (data.inQueue) {
                setQueueStatus({
                    inQueue: true,
                    position: data.queueEntry?.position,
                    queueEntry: data.queueEntry,
                    stationName: data.stationName,
                });
            } else {
                setQueueStatus(null);
            }
        } catch {
            setQueueStatus(null);
        }
    }, [station.id]);

    useEffect(() => {
        fetchDetail();
        fetchQueueStatus();
    }, [fetchDetail, fetchQueueStatus]);

    // Real-time: update slot status when server broadcasts changes
    useSocket('slot_status_changed', ({ stationId, slotId, status }) => {
        if (stationId !== station.id) return;
        setDetail((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                slots: prev.slots.map((s) => (s.id === slotId ? { ...s, status } : s)),
            };
        });
        // If a slot just became available, clear selected slot if it was that slot
        if (status === 'available') {
            setSelectedSlot((prev) => (prev?.id === slotId ? null : prev));
        }
    });

    // Real-time: update queue length
    useSocket('queue_updated', ({ stationId, queue_length }) => {
        if (stationId !== station.id) return;
        setDetail((prev) => prev ? { ...prev, queue_length } : prev);
    });

    // Real-time: update MY queue position
    useSocket('queue_position_updated', ({ stationId, position, status }) => {
        if (stationId !== station.id) return;
        if (status === 'waiting') {
            setQueueStatus((prev) => prev ? { ...prev, position } : prev);
        }
    });

    // Real-time: slot assigned to ME from queue
    useSocket('slot_assigned', ({ stationId, bookingId }) => {
        if (stationId !== station.id) return;
        // The queue cleared, refresh data
        setQueueStatus(null);
        fetchDetail();
        onBookingCreated && onBookingCreated({ id: bookingId });
        toast.success('🎉 Your slot has been assigned! Booking is now active.', { duration: 8000 });
        onClose();
    });

    const handleBook = async () => {
        if (!selectedSlot) return toast.error('Please select an available slot');
        if (!showConfirmDialog) {
            setShowConfirmDialog(true);
            return;
        }
        setShowConfirmDialog(false);
        setBookingLoading(true);
        try {
            const { data } = await api.post('/bookings', {
                stationId: station.id,
                slotId: selectedSlot.id,
            });
            toast.success('🎉 Slot booked successfully!');
            onBookingCreated && onBookingCreated(data.booking);
            onClose();
        } catch (err) {
            const msg = err.response?.data?.error || 'Booking failed';
            toast.error(msg);
            if (err.response?.status === 409) fetchDetail();
        } finally {
            setBookingLoading(false);
        }
    };

    const handleJoinQueue = async () => {
        setQueueLoading(true);
        try {
            const { data } = await api.post('/queue', { stationId: station.id });
            const pos = data.queueEntry?.position;
            toast.success(`✅ You're #${pos} in the queue! We'll notify you when a slot opens.`, { duration: 6000 });
            setQueueStatus({
                inQueue: true,
                position: pos,
                queueEntry: data.queueEntry,
            });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to join queue');
        } finally {
            setQueueLoading(false);
        }
    };

    const handleLeaveQueue = async () => {
        if (!queueStatus?.queueEntry) return;
        try {
            // Use stationId/leave route
            await api.delete(`/queue/${station.id}/leave`);
            toast.success('You have left the queue.');
            setQueueStatus(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to leave queue');
        }
    };

    const getSlotStatusColor = (status) => {
        if (status === 'available') return 'var(--success)';
        if (status === 'occupied') return 'var(--danger)';
        return 'var(--warning)';
    };

    const getSlotStatusIcon = (status) => {
        if (status === 'available') return 'fa-circle-check';
        if (status === 'occupied') return 'fa-circle-xmark';
        if (status === 'maintenance') return 'fa-wrench';
        return 'fa-circle-minus';
    };

    if (loading) {
        return (
            <div className="station-detail">
                <div className="empty-state">
                    <div className="spinner" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading station details...</p>
                </div>
            </div>
        );
    }

    if (!detail) return null;

    const { station: s, slots = [], queue_length = 0 } = detail;
    const safeSlots = Array.isArray(slots) ? slots : [];
    const availableSlots = safeSlots.filter((sl) => sl?.status === 'available');
    const occupiedSlots = safeSlots.filter((sl) => sl?.status === 'occupied');
    const allFull = availableSlots.length === 0 && occupiedSlots.length > 0;
    const allOffline = safeSlots.length === 0 || safeSlots.every(sl => sl.status === 'maintenance' || sl.status === 'offline');

    return (
        <div className="station-detail">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{s.name}</h2>
                    <div
                        className="info-row"
                        style={{ cursor: 'pointer' }}
                        title="Click to copy address"
                        onClick={() => {
                            navigator.clipboard.writeText(s.address).then(() => toast.success('Address copied!'));
                        }}
                    >
                        <i className="fas fa-map-marker-alt" />{s.address}
                        <i className="fas fa-copy" style={{ marginLeft: '6px', opacity: 0.4, fontSize: '0.7rem' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={onGetDirections}
                        title="Get Directions"
                    >
                        <i className="fas fa-directions" />
                    </button>
                    <button
                        className="btn btn-ghost btn-circle"
                        onClick={onToggleFavorite}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <i
                            className={`fas fa-heart`}
                            style={{ color: isFavorite ? 'var(--danger)' : 'var(--text-muted)' }}
                        />
                    </button>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
                </div>
            </div>

            {/* Meta badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-primary">₹{s.price_per_kwh}/kWh</span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>⭐ {s.rating}</span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    <i className="fas fa-clock" /> {s.operating_hours}
                </span>
                {queue_length > 0 && (
                    <span className="badge badge-warning">
                        <i className="fas fa-users" /> {queue_length} in queue
                    </span>
                )}
                {allFull && (
                    <span className="badge badge-danger">
                        <i className="fas fa-ban" /> All Slots Full
                    </span>
                )}
            </div>

            {/* Directions Info */}
            {directionsInfo && (
                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    background: 'rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    color: '#60a5fa'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fas fa-car" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{directionsInfo.duration}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>drive</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fas fa-route" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{directionsInfo.distance}</span>
                    </div>
                </div>
            )}

            {/* ── Real-time Queue Status Card (MY position) ── */}
            {queueStatus?.inQueue && (
                <div className="queue-status-card" style={{
                    background: 'linear-gradient(135deg, rgba(255,183,0,0.12), rgba(255,183,0,0.04))',
                    border: '1px solid rgba(255,183,0,0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <i className="fas fa-clock" style={{ color: 'var(--warning)' }} />
                                You're in the queue
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>
                                #{queueStatus.position}
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                    in line
                                </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                We'll notify you instantly when a slot opens
                            </div>
                        </div>
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={handleLeaveQueue}
                            style={{ flexShrink: 0 }}
                        >
                            <i className="fas fa-times" /> Leave Queue
                        </button>
                    </div>
                </div>
            )}

            <div className="divider" />

            {/* ── Charging Slots ── */}
            <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Charging Slots
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                        ({availableSlots.length}/{safeSlots.length} available)
                    </span>
                </div>
            </div>

            <div className="slot-grid">
                {safeSlots.map((slot) => {
                    const isAvailable = slot.status === 'available';
                    const isSelected = selectedSlot?.id === slot.id;

                    return (
                        <div
                            key={slot.id}
                            className={`slot-item ${slot.status}`}
                            onClick={() => isAvailable && setSelectedSlot(isSelected ? null : slot)}
                            style={{
                                border: isSelected
                                    ? '2px solid var(--primary)'
                                    : slot.status === 'occupied'
                                        ? '1px solid rgba(255,72,66,0.25)'
                                        : undefined,
                                background: isSelected
                                    ? 'rgba(0,212,170,0.12)'
                                    : slot.status === 'occupied'
                                        ? 'rgba(255,72,66,0.06)'
                                        : undefined,
                                cursor: isAvailable ? 'pointer' : 'default',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {/* Status icon */}
                            <i
                                className={`fas ${getSlotStatusIcon(slot.status)}`}
                                style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    fontSize: '0.65rem',
                                    color: getSlotStatusColor(slot.status),
                                }}
                            />
                            <div className="slot-name">{slot.slot_name}</div>
                            <div className="slot-type">{slot.connector_type}</div>
                            <div className="slot-power">{slot.power_kw} kW</div>
                            <div style={{
                                fontSize: '0.68rem',
                                marginTop: '0.25rem',
                                fontWeight: 600,
                                color: getSlotStatusColor(slot.status),
                            }}>
                                {slot.status === 'available' && '✓ Available'}
                                {slot.status === 'occupied' && '✗ In Use'}
                                {slot.status === 'maintenance' && '⚙ Maintenance'}
                                {slot.status === 'offline' && '○ Offline'}
                            </div>
                            {/* Checkmark when selected */}
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    background: 'var(--primary)',
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <i className="fas fa-check" style={{ fontSize: '0.5rem', color: '#000' }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="divider" />

            {/* ── Action Buttons ── */}
            {!queueStatus?.inQueue && (
                <>
                    {allOffline ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '1rem',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                        }}>
                            <i className="fas fa-tools" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                            All slots are under maintenance or offline.
                        </div>
                    ) : allFull ? (
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'rgba(255,72,66,0.07)',
                                border: '1px solid rgba(255,72,66,0.2)',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                marginBottom: '0.8rem',
                            }}>
                                <i className="fas fa-circle-exclamation" style={{ color: 'var(--danger)', fontSize: '1.2rem', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.15rem' }}>All slots are currently occupied</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Join the queue — you'll be automatically assigned a slot and notified the moment one opens.
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn btn-full"
                                style={{ background: 'var(--warning)', color: '#000', fontWeight: 700 }}
                                onClick={handleJoinQueue}
                                disabled={queueLoading}
                            >
                                {queueLoading ? <span className="spinner" /> : <i className="fas fa-users-line" />}
                                {queueLoading ? 'Joining Queue...' : `Join Queue (${queue_length} waiting)`}
                            </button>
                        </div>
                    ) : (
                        <div>
                            {!selectedSlot && (
                                <div style={{
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.75rem',
                                }}>
                                    <i className="fas fa-hand-pointer" style={{ marginRight: '5px' }} />
                                    Tap an available slot above to select it
                                </div>
                            )}

                            {/* Cost Estimator (visible when slot selected) */}
                            {selectedSlot && (
                                <CostEstimator slot={selectedSlot} pricePerKwh={s.price_per_kwh} />
                            )}

                            {/* Booking Confirmation Dialog */}
                            {showConfirmDialog && selectedSlot && (
                                <div style={{
                                    margin: '0.75rem 0',
                                    padding: '1rem',
                                    background: 'rgba(0,212,170,0.06)',
                                    border: '1px solid rgba(0,212,170,0.2)',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <i className="fas fa-circle-check" style={{ color: 'var(--primary)' }} />
                                        Confirm Booking
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                        <div><strong>Station:</strong> {s.name}</div>
                                        <div><strong>Slot:</strong> {selectedSlot.slot_name} ({selectedSlot.connector_type})</div>
                                        <div><strong>Power:</strong> {selectedSlot.power_kw} kW</div>
                                        <div><strong>Rate:</strong> ₹{s.price_per_kwh}/kWh</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setShowConfirmDialog(false)}
                                            style={{ flex: 1 }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={handleBook}
                                            disabled={bookingLoading}
                                            style={{ flex: 1 }}
                                        >
                                            {bookingLoading ? <span className="spinner" /> : <i className="fas fa-check" />}
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!showConfirmDialog && (
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={handleBook}
                                    disabled={!selectedSlot || bookingLoading}
                                    style={{ marginTop: '0.75rem' }}
                                >
                                    {bookingLoading ? <span className="spinner" /> : <i className="fas fa-bolt" />}
                                    {bookingLoading
                                        ? 'Booking...'
                                        : selectedSlot
                                            ? `Book ${selectedSlot.slot_name} (${selectedSlot.connector_type})`
                                            : 'Select a slot above to book'}
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Amenities ── */}
            {s.amenities && Array.isArray(s.amenities) && s.amenities.length > 0 && (() => {
                const AMENITY_ICONS = {
                    'WiFi': 'fa-wifi', 'Parking': 'fa-parking', 'Restroom': 'fa-restroom',
                    'Restrooms': 'fa-restroom', 'Cafe': 'fa-coffee', 'Coffee Shop': 'fa-coffee',
                    'Food': 'fa-utensils', 'Restaurant': 'fa-utensils', 'ATM': 'fa-credit-card',
                    'Security': 'fa-shield-alt', 'CCTV': 'fa-video', 'Lounge': 'fa-couch',
                    'Tech Lounge': 'fa-laptop', 'EV Store': 'fa-store', 'Air': 'fa-wind',
                    'Water': 'fa-tint', 'Shopping': 'fa-bag-shopping', 'Shopping Center': 'fa-building',
                    'Playground': 'fa-children',
                };
                return (
                    <>
                        <div className="divider" />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Amenities</div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {s.amenities.map((a) => (
                                <span
                                    key={a}
                                    className="badge"
                                    style={{ background: 'rgba(0,212,170,0.08)', color: 'var(--primary)', border: '1px solid rgba(0,212,170,0.15)', fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                                >
                                    <i className={`fas ${AMENITY_ICONS[a] || 'fa-check'}`} style={{ marginRight: '4px', fontSize: '0.65rem' }} />
                                    {a}
                                </span>
                            ))}
                        </div>
                    </>
                );
            })()}

            {/* ── Contact Info ── */}
            {(s.phone || s.email) && (
                <>
                    <div className="divider" />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Contact</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {s.phone && (
                            <a href={`tel:${s.phone}`} className="info-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <i className="fas fa-phone" style={{ color: 'var(--primary)' }} />
                                {s.phone}
                            </a>
                        )}
                        {s.email && (
                            <a href={`mailto:${s.email}`} className="info-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <i className="fas fa-envelope" style={{ color: 'var(--primary)' }} />
                                {s.email}
                            </a>
                        )}
                    </div>
                </>
            )}

            <div className="divider" />

            {/* ── Reviews ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Reviews</div>
                {!showReviewForm && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowReviewForm(true)}>
                        <i className="fas fa-pen" /> Write a Review
                    </button>
                )}
            </div>

            {showReviewForm && (
                <AddReview
                    stationId={station.id}
                    onCancel={() => setShowReviewForm(false)}
                    onReviewAdded={() => {
                        setShowReviewForm(false);
                        setReviewRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}

            <ReviewList stationId={station.id} refreshTrigger={reviewRefreshTrigger} />
        </div>
    );
};

export default StationDetail;
