import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CONNECTOR_TYPES = ['Type 2', 'CCS', 'CHAdeMO', 'Tesla Supercharger', 'GB/T', 'Type 1'];
const SLOT_STATUSES = ['available', 'occupied', 'maintenance', 'offline'];

const statusColors = {
    available: 'var(--success)',
    occupied: 'var(--danger)',
    maintenance: 'var(--warning)',
    offline: 'var(--text-muted)',
};

/**
 * SlotManager component
 * Admin panel to view, add, delete, and update slots for a station.
 */
const SlotManager = ({ stationId, stationName, onClose }) => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSlot, setNewSlot] = useState({ slot_name: '', connector_type: 'Type 2', power_kw: '' });
    const [adding, setAdding] = useState(false);

    const fetchSlots = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/stations/${stationId}`);
            setSlots(data.slots || []);
        } catch (err) {
            toast.error('Failed to load slots');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, [stationId]);

    const handleAddSlot = async (e) => {
        e.preventDefault();
        if (!newSlot.slot_name || !newSlot.power_kw) return toast.error('Fill all fields');
        setAdding(true);
        try {
            const { data } = await api.post(`/stations/${stationId}/slots`, newSlot);
            setSlots(prev => [...prev, data.slot]);
            setNewSlot({ slot_name: '', connector_type: 'Type 2', power_kw: '' });
            setShowAddForm(false);
            toast.success('Slot added successfully');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add slot');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!window.confirm('Delete this slot? This cannot be undone.')) return;
        try {
            await api.delete(`/stations/${stationId}/slots/${slotId}`);
            setSlots(prev => prev.filter(s => s.id !== slotId));
            toast.success('Slot deleted');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete slot');
        }
    };

    const handleStatusChange = async (slotId, status) => {
        try {
            await api.put(`/stations/${stationId}/slots/${slotId}`, { status });
            setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
            toast.success('Slot status updated');
        } catch (err) {
            toast.error('Failed to update slot status');
        }
    };

    return (
        <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '0.75rem'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    <i className="fas fa-plug" style={{ marginRight: '0.5rem', color: 'var(--primary)' }} />
                    Slots — {stationName}
                    <span className="badge" style={{ marginLeft: '0.5rem', background: 'rgba(255,255,255,0.1)' }}>
                        {slots.length}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        <i className={`fas fa-${showAddForm ? 'times' : 'plus'}`} style={{ marginRight: '0.4rem' }} />
                        {showAddForm ? 'Cancel' : 'Add Slot'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>
                        <i className="fas fa-chevron-up" />
                    </button>
                </div>
            </div>

            {/* Add Slot Form */}
            {showAddForm && (
                <form onSubmit={handleAddSlot} style={{
                    background: 'rgba(0,212,170,0.05)',
                    border: '1px solid rgba(0,212,170,0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: '0.5rem',
                    alignItems: 'end'
                }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Slot Name</label>
                        <input
                            className="input-field"
                            placeholder="e.g. Slot A1"
                            value={newSlot.slot_name}
                            onChange={e => setNewSlot(p => ({ ...p, slot_name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Connector</label>
                        <select
                            className="input-field"
                            value={newSlot.connector_type}
                            onChange={e => setNewSlot(p => ({ ...p, connector_type: e.target.value }))}
                        >
                            {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Power (kW)</label>
                        <input
                            className="input-field"
                            type="number"
                            placeholder="e.g. 22"
                            value={newSlot.power_kw}
                            onChange={e => setNewSlot(p => ({ ...p, power_kw: e.target.value }))}
                            min="1"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                        {adding ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : 'Add'}
                    </button>
                </form>
            )}

            {/* Slots List */}
            {loading ? (
                <div className="spinner" style={{ margin: '1rem auto' }} />
            ) : slots.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '0.85rem' }}>
                    No slots yet. Add the first slot above.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {slots.map(slot => (
                        <div key={slot.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 80px 120px auto',
                            gap: '0.5rem',
                            alignItems: 'center',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ fontWeight: 600 }}>{slot.slot_name}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{slot.connector_type}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{slot.power_kw} kW</div>
                            <select
                                className="input-field"
                                value={slot.status}
                                onChange={e => handleStatusChange(slot.id, e.target.value)}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    color: statusColors[slot.status],
                                    background: 'rgba(255,255,255,0.05)'
                                }}
                            >
                                {SLOT_STATUSES.map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                            <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeleteSlot(slot.id)}
                                title="Delete slot"
                            >
                                <i className="fas fa-trash" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SlotManager;
