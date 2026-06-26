import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * FavoritesView component
 * Displays all stations the user has favorited.
 * Allows unfavoriting and opening station detail.
 */
const FavoritesView = ({ onBack, onSelectStation, onToggleFavorite, favorites }) => {
    const [favStations, setFavStations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/favorites');
            setFavStations(data.favorites);
        } catch (err) {
            toast.error('Failed to load favorites');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, []);

    const handleUnfavorite = async (e, stationId) => {
        e.stopPropagation();
        await onToggleFavorite(stationId);
        setFavStations(prev => prev.filter(s => s.id !== stationId));
    };

    const getAvailabilityClass = (available, total) => {
        if (!total) return 'full';
        const ratio = available / total;
        if (ratio === 0) return 'full';
        if (ratio < 0.5) return 'partial';
        return 'available';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={onBack}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <i className="fas fa-heart" style={{ color: 'var(--danger)' }} />
                    <span style={{ fontWeight: 700 }}>My Favorites</span>
                    <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>
                        {favStations.length}
                    </span>
                </div>
            </div>

            {/* List */}
            <div className="station-list" style={{ flex: 1, overflowY: 'auto' }}>
                {loading && (
                    <div className="empty-state">
                        <div className="spinner" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                        <p style={{ marginTop: '1rem' }}>Loading favorites...</p>
                    </div>
                )}

                {!loading && favStations.length === 0 && (
                    <div className="empty-state">
                        <i className="fas fa-heart-broken" style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '1rem', color: 'var(--danger)' }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No favorites yet</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Tap the ❤️ on any station to save it here.
                        </p>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={onBack}>
                            <i className="fas fa-search" style={{ marginRight: '0.5rem' }} />
                            Browse Stations
                        </button>
                    </div>
                )}

                {!loading && favStations.map((station) => {
                    const available = parseInt(station.available_slots) || 0;
                    const total = parseInt(station.total_slots) || 0;
                    const cls = getAvailabilityClass(available, total);

                    return (
                        <div
                            key={station.id}
                            className="station-card"
                            onClick={() => onSelectStation(station)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="station-card-header">
                                <div className="station-name">{station.name}</div>
                                <button
                                    className="btn btn-ghost btn-circle btn-xs"
                                    onClick={(e) => handleUnfavorite(e, station.id)}
                                    title="Remove from favorites"
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <i className="fas fa-heart" style={{ color: 'var(--danger)' }} />
                                </button>
                            </div>

                            <div className="info-row" style={{ marginBottom: '0.5rem' }}>
                                <i className="fas fa-map-marker-alt" />
                                <span>{station.local_area || station.city}{station.district ? `, ${station.district}` : ''}</span>
                            </div>

                            <div className="station-meta">
                                <span className={`badge badge-${cls === 'available' ? 'success' : cls === 'partial' ? 'warning' : 'danger'}`}>
                                    <i className="fas fa-circle" style={{ fontSize: '6px' }} />
                                    {available}/{total} slots
                                </span>
                                <span className="badge badge-primary">₹{station.price_per_kwh}/kWh</span>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    ⭐ {station.rating}
                                </span>
                            </div>

                            {station.favorited_at && (
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                                    <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                                    Saved {new Date(station.favorited_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FavoritesView;
