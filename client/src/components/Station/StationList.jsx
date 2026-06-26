import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';
import useSocket from '../../hooks/useSocket';

const CONNECTOR_TYPES = ['All', 'CCS', 'CHAdeMO', 'Type 2', 'Type 1', 'GB/T'];

const StationList = ({ userLocation, onSelectStation, selectedStation, onStationsLoaded, favorites, onToggleFavorite }) => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [connectorFilter, setConnectorFilter] = useState('All');
    const [sortBy, setSortBy] = useState('rating'); // 'distance' | 'price' | 'rating' | 'slots'
    const [availableOnly, setAvailableOnly] = useState(false);
    const [radius, setRadius] = useState(50); // km
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'nearby'

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/stations');
            const fetched = data.stations || [];
            setStations(fetched);
            if (onStationsLoaded) onStationsLoaded(fetched);
        } catch (err) {
            console.error('Failed to fetch all stations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNearby = useCallback(async () => {
        if (!userLocation.lat || !userLocation.lng) return;
        setLoading(true);
        try {
            const { data } = await api.get('/stations/nearby', {
                params: { lat: userLocation.lat, lng: userLocation.lng, radius },
            });
            const fetched = data.stations || [];
            setStations(fetched);
            if (onStationsLoaded) onStationsLoaded(fetched);
        } catch (err) {
            console.error('Failed to fetch nearby stations:', err);
        } finally {
            setLoading(false);
        }
    }, [userLocation.lat, userLocation.lng, radius]);

    const refreshStations = useCallback(() => {
        if (viewMode === 'nearby') fetchNearby();
        else fetchAll();
    }, [viewMode, fetchNearby, fetchAll]);

    useEffect(() => {
        refreshStations();
    }, [refreshStations]);

    useSocket('availability_updated', ({ stationId, available_slots, total_slots }) => {
        setStations((prev) =>
            prev.map((s) =>
                s.id === stationId
                    ? { ...s, available_slots: parseInt(available_slots), total_slots: parseInt(total_slots) }
                    : s
            )
        );
    });

    useEffect(() => {
        if (selectedStation) {
            socket.emit('join_station_room', { stationId: selectedStation.id });
        }
        return () => {
            if (selectedStation) {
                socket.emit('leave_station_room', { stationId: selectedStation.id });
            }
        };
    }, [selectedStation?.id]);

    const filtered = stations
        .filter((s) => {
            const matchesSearch =
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.local_area?.toLowerCase().includes(search.toLowerCase()) ||
                s.district?.toLowerCase().includes(search.toLowerCase());
            const matchesAvail = !availableOnly || parseInt(s.available_slots) > 0;
            const matchesConnector = connectorFilter === 'All' || (
                Array.isArray(s.connector_types)
                    ? s.connector_types.includes(connectorFilter)
                    : (s.connector_types || '').includes(connectorFilter)
            );
            return matchesSearch && matchesAvail && matchesConnector;
        })
        .sort((a, b) => {
            if (sortBy === 'price') return parseFloat(a.price_per_kwh) - parseFloat(b.price_per_kwh);
            if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
            if (sortBy === 'slots') return parseInt(b.available_slots) - parseInt(a.available_slots);
            return parseFloat(a.distance_km || 0) - parseFloat(b.distance_km || 0);
        });

    const getAvailabilityClass = (available, total) => {
        if (!total) return 'full';
        const ratio = available / total;
        if (ratio === 0) return 'full';
        if (ratio < 0.5) return 'partial';
        return 'available';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search & Filters */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <i className="fas fa-charging-station" style={{ color: 'var(--primary)' }} />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                            className={`btn btn-xs ${viewMode === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setViewMode('all')}
                        >
                            All Stations
                        </button>
                        <button
                            className={`btn btn-xs ${viewMode === 'nearby' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setViewMode('nearby')}
                        >
                            Nearby
                        </button>
                    </div>
                    <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>{filtered.length}</span>
                </div>

                <div className="search-bar" style={{ marginBottom: '0.5rem' }}>
                    <input
                        className="search-input"
                        placeholder="Search stations, areas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="btn btn-ghost btn-sm" onClick={refreshStations} title="Refresh">
                        <i className="fas fa-sync-alt" />
                    </button>
                </div>

                {/* Filter row */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <select
                        className="input-field"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{ flex: 1, minWidth: '90px', fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                    >
                        <option value="distance">📍 Distance</option>
                        <option value="price">💰 Price</option>
                        <option value="rating">⭐ Rating</option>
                        <option value="slots">🔌 Slots</option>
                    </select>
                    <select
                        className="input-field"
                        value={radius}
                        onChange={e => setRadius(Number(e.target.value))}
                        style={{ minWidth: '70px', fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                    >
                        <option value={10}>10 km</option>
                        <option value={25}>25 km</option>
                        <option value={50}>50 km</option>
                        <option value={100}>100 km</option>
                        <option value={200}>200 km</option>
                        <option value={500}>500 km</option>
                    </select>
                    <button
                        className={`btn btn-sm ${availableOnly ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setAvailableOnly(v => !v)}
                        title="Available only"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                        <i className="fas fa-circle" style={{ fontSize: '0.5rem', marginRight: '4px', color: availableOnly ? undefined : 'var(--success)' }} />
                        Free
                    </button>
                </div>

                {/* Connector type pills */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {CONNECTOR_TYPES.map(ct => (
                        <button
                            key={ct}
                            className={`btn btn-xs ${connectorFilter === ct ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setConnectorFilter(ct)}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                            {ct}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="station-list" style={{ flex: 1, overflowY: 'auto' }}>
                {loading && (
                    <div className="empty-state">
                        <div className="spinner" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                        <p style={{ marginTop: '1rem' }}>Finding stations near you...</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="empty-state">
                        <i className="fas fa-charging-station" style={{ fontSize: '2rem', marginBottom: '0.75rem' }} />
                        {stations.length === 0 ? (
                            <>
                                <p style={{ fontWeight: 600 }}>No charging stations registered yet.</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    An admin needs to add real stations via the Admin Dashboard.
                                </p>
                            </>
                        ) : (
                            <>
                                <p>No stations match your filters.</p>
                                {availableOnly && (
                                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setAvailableOnly(false)}>
                                        Show all stations
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {!loading && filtered.map((station) => {
                    const available = parseInt(station.available_slots) || 0;
                    const total = parseInt(station.total_slots) || 0;
                    const fillPct = total > 0 ? (available / total) * 100 : 0;
                    const cls = getAvailabilityClass(available, total);

                    return (
                        <div
                            key={station.id}
                            className={`station-card ${selectedStation?.id === station.id ? 'selected' : ''}`}
                            onClick={() => onSelectStation(station)}
                        >
                            <div className="station-card-header">
                                <div className="station-name">{station.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                                    <button
                                        className="btn btn-ghost btn-circle btn-xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleFavorite(station.id);
                                        }}
                                        style={{ marginRight: '0.5rem' }}
                                    >
                                        <i
                                            className={`fas fa-heart ${favorites?.has(station.id) ? 'text-danger' : ''}`}
                                            style={{ color: favorites?.has(station.id) ? 'var(--danger)' : 'var(--text-muted)' }}
                                        />
                                    </button>
                                    <div className="station-distance">
                                        <i className="fas fa-location-dot" style={{ marginRight: '3px' }} />
                                        {station.distance_km ? `${parseFloat(station.distance_km).toFixed(1)} km` : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="station-meta">
                                <span className={`badge badge-${cls === 'available' ? 'success' : cls === 'partial' ? 'warning' : 'danger'}`}>
                                    <i className={`fas fa-circle`} style={{ fontSize: '6px' }} />
                                    {available}/{total} slots
                                </span>
                                <span className="badge badge-primary">₹{station.price_per_kwh}/kWh</span>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    ⭐ {station.rating}
                                </span>
                                {cls === 'full' && (
                                    <span className="badge" style={{ background: 'rgba(255,183,0,0.15)', color: 'var(--warning)', border: '1px solid rgba(255,183,0,0.3)', fontSize: '0.65rem' }}>
                                        <i className="fas fa-users" style={{ fontSize: '0.55rem' }} /> Queue
                                    </span>
                                )}
                            </div>

                            <div className="station-availability">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Availability</span>
                                <div className="slots-bar">
                                    <div className={`slots-fill ${cls}`} style={{ width: `${fillPct}%` }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: cls === 'full' ? 'var(--danger)' : 'var(--success)' }}>
                                    {cls === 'full' ? 'Full' : `${available} free`}
                                </span>
                            </div>

                            {station.local_area && (
                                <div className="info-row" style={{ marginTop: '0.5rem' }}>
                                    <i className="fas fa-map-pin" />
                                    <span>{station.local_area}{station.landmark ? ` · ${station.landmark}` : ''}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StationList;
