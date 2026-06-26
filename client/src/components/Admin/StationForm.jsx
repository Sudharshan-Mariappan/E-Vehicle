import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CONNECTOR_TYPES = ['CCS', 'CHAdeMO', 'Type 2', 'Type 1', 'GB/T'];
const AMENITY_OPTIONS = ['WiFi', 'Parking', 'Restroom', 'Cafe', 'Restaurant', 'Shopping', 'ATM', 'Security'];

const StationForm = ({ station, onCancel, onSuccess }) => {
    const isEdit = !!station;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: station?.name || '',
        address: station?.address || '',
        latitude: station?.latitude || '',
        longitude: station?.longitude || '',
        city: station?.city || '',
        district: station?.district || '',
        state: station?.state || '',
        local_area: station?.local_area || '',
        pincode: station?.pincode || '',
        price_per_kwh: station?.price_per_kwh || '',
        phone: station?.phone || '',
        email: station?.email || '',
        operating_hours: station?.operating_hours || '24/7',
        landmark: station?.landmark || '',
    });
    const [amenities, setAmenities] = useState(new Set(station?.amenities || []));

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleAmenity = (amenity) => {
        setAmenities(prev => {
            const next = new Set(prev);
            if (next.has(amenity)) next.delete(amenity);
            else next.add(amenity);
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData, amenities: [...amenities] };
            if (isEdit) {
                await api.put(`/stations/${station.id}`, payload);
                toast.success('Station updated successfully');
            } else {
                await api.post('/stations', payload);
                toast.success('Station created successfully');
            }
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="btn btn-ghost btn-circle" onClick={onCancel} style={{ marginRight: '0.5rem' }}>
                    <i className="fas fa-arrow-left" />
                </button>
                <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Station' : 'Add New Station'}</h3>
            </div>

            <form onSubmit={handleSubmit} style={{ paddingBottom: '2rem' }}>
                {/* Basic Info */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Basic Info
                </div>
                <div className="form-group">
                    <label>Station Name *</label>
                    <input className="input-field" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Green Charge Hub" />
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Latitude *</label>
                        <input className="input-field" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} required placeholder="12.9716" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Longitude *</label>
                        <input className="input-field" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} required placeholder="77.5946" />
                    </div>
                </div>

                <div className="form-group">
                    <label>Address *</label>
                    <textarea className="input-field" name="address" rows="2" value={formData.address} onChange={handleChange} required placeholder="Full street address" />
                </div>

                {/* Location */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.75rem 0 0.5rem' }}>
                    Location
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>City *</label>
                        <input className="input-field" name="city" value={formData.city} onChange={handleChange} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>State *</label>
                        <input className="input-field" name="state" value={formData.state} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>District *</label>
                        <input className="input-field" name="district" value={formData.district} onChange={handleChange} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Local Area</label>
                        <input className="input-field" name="local_area" value={formData.local_area} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Pincode *</label>
                        <input className="input-field" name="pincode" value={formData.pincode} onChange={handleChange} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Landmark</label>
                        <input className="input-field" name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Near ..." />
                    </div>
                </div>

                {/* Pricing & Hours */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.75rem 0 0.5rem' }}>
                    Pricing & Hours
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Price (₹/kWh) *</label>
                        <input className="input-field" name="price_per_kwh" type="number" step="0.01" value={formData.price_per_kwh} onChange={handleChange} required placeholder="8.50" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Operating Hours</label>
                        <input className="input-field" name="operating_hours" value={formData.operating_hours} onChange={handleChange} placeholder="24/7 or 8AM-10PM" />
                    </div>
                </div>

                {/* Contact */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.75rem 0 0.5rem' }}>
                    Contact
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Phone</label>
                        <input className="input-field" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 ..." />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Email</label>
                        <input className="input-field" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="station@example.com" />
                    </div>
                </div>

                {/* Amenities */}
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.75rem 0 0.5rem' }}>
                    Amenities
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {AMENITY_OPTIONS.map(a => (
                        <button
                            key={a}
                            type="button"
                            className={`btn btn-sm ${amenities.has(a) ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => toggleAmenity(a)}
                            style={{ fontSize: '0.78rem' }}
                        >
                            {amenities.has(a) && <i className="fas fa-check" style={{ marginRight: '4px', fontSize: '0.65rem' }} />}
                            {a}
                        </button>
                    ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? (
                        <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }} />Saving...</>
                    ) : (
                        <><i className="fas fa-save" style={{ marginRight: '0.5rem' }} />{isEdit ? 'Update Station' : 'Create Station'}</>
                    )}
                </button>
            </form>
        </div>
    );
};

export default StationForm;
