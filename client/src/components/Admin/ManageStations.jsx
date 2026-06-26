import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import StationForm from './StationForm';
import SlotManager from './SlotManager';
import toast from 'react-hot-toast';

const ManageStations = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingStation, setEditingStation] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [expandedSlots, setExpandedSlots] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'maintenance'

    const fetchStations = async () => {
        try {
            const { data } = await api.get('/stations/nearby', {
                params: { lat: 0, lng: 0, radius: 20000, includeAll: true }
            });
            setStations(data.stations);
        } catch (err) {
            console.error('Failed to load stations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this station?')) return;
        try {
            await api.delete(`/stations/${id}`);
            toast.success('Station deleted');
            setStations(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast.error('Failed to delete station');
        }
    };

    const handleToggleStatus = async (station) => {
        const newStatus = station.status === 'active' ? 'maintenance' : 'active';
        try {
            await api.put(`/stations/${station.id}/status`, { status: newStatus });
            setStations(prev => prev.map(s => s.id === station.id ? { ...s, status: newStatus } : s));
            toast.success(`Station ${newStatus === 'active' ? 'activated' : 'under maintenance'}`);
        } catch (err) {
            toast.error('Failed to update station status');
        }
    };

    const filteredStations = useMemo(() => {
        const q = search.toLowerCase();
        return stations.filter(s => {
            const matchesSearch = !search ||
                s.name.toLowerCase().includes(q) ||
                s.city?.toLowerCase().includes(q) ||
                s.district?.toLowerCase().includes(q) ||
                s.state?.toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [stations, search, statusFilter]);

    if (isCreating || editingStation) {
        return (
            <StationForm
                station={editingStation}
                onCancel={() => {
                    setIsCreating(false);
                    setEditingStation(null);
                }}
                onSuccess={() => {
                    setIsCreating(false);
                    setEditingStation(null);
                    fetchStations();
                }}
            />
        );
    }

    return (
        <div>
            {/* Stats + Actions Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.07)', fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                        <i className="fas fa-charging-station" style={{ marginRight: '5px', color: 'var(--primary)' }} />
                        {stations.length} Total
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                        {stations.filter(s => s.status === 'active').length} Active
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
                        {stations.filter(s => s.status !== 'active').length} Maintenance
                    </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setIsCreating(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} />
                    Add New
                </button>
            </div>

            {/* Search + Status Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <input
                        className="search-input"
                        placeholder="Search by name, city, district..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
                            <i className="fas fa-times" />
                        </button>
                    )}
                </div>
                <select
                    className="input-field"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '90px', fontSize: '0.8rem' }}
                >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>

            {loading ? (
                <div className="spinner" />
            ) : filteredStations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.9rem' }}>
                    {search ? `No stations match "${search}"` : 'No stations found'}
                </div>
            ) : (
                <div className="list-group">
                    {filteredStations.map(station => (
                        <div key={station.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{station.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {station.city}, {station.state}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span className="badge badge-primary">₹{station.price_per_kwh}/kWh</span>
                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <i className="fas fa-plug" style={{ marginRight: '4px', fontSize: '0.7rem' }} />
                                            {station.total_slots || 0} Slots
                                        </span>
                                        <span className={`badge badge-${station.status === 'active' ? 'success' : 'warning'}`}>
                                            {station.status}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {/* Status toggle */}
                                    <button
                                        className={`btn btn-xs ${station.status === 'active' ? 'btn-ghost' : 'btn-primary'}`}
                                        onClick={() => handleToggleStatus(station)}
                                        title={station.status === 'active' ? 'Deactivate' : 'Activate'}
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                        <i className={`fas fa-${station.status === 'active' ? 'pause' : 'play'}`} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setExpandedSlots(expandedSlots === station.id ? null : station.id)}
                                        title="Manage Slots"
                                        style={{ color: expandedSlots === station.id ? 'var(--primary)' : undefined }}
                                    >
                                        <i className="fas fa-plug" />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setEditingStation(station)}
                                    >
                                        <i className="fas fa-edit" />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--danger)' }}
                                        onClick={() => handleDelete(station.id)}
                                    >
                                        <i className="fas fa-trash" />
                                    </button>
                                </div>
                            </div>

                            {/* Inline Slot Manager */}
                            {expandedSlots === station.id && (
                                <SlotManager
                                    stationId={station.id}
                                    stationName={station.name}
                                    onClose={() => setExpandedSlots(null)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageStations;
