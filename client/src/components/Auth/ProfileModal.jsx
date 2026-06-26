import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const VEHICLE_ICONS = {
    'Two-Wheeler': 'fa-motorcycle',
    'Car': 'fa-car',
    'SUV': 'fa-truck-pickup',
    'Other': 'fa-plug',
};

const ProfileModal = ({ onClose }) => {
    const { user, login } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileData, setProfileData] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', vehicle_type: '' });
    const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    useEffect(() => {
        api.get('/auth/me')
            .then(({ data }) => {
                setProfileData(data.user);
                setFormData({
                    name: data.user.name || '',
                    phone: data.user.phone || '',
                    vehicle_type: data.user.vehicle_type || '',
                });
            })
            .catch(() => {
                if (user) {
                    setFormData({ name: user.name || '', phone: user.phone || '', vehicle_type: user.vehicle_type || '' });
                }
            });
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put('/auth/profile', formData);
            toast.success('Profile updated!');
            const token = localStorage.getItem('ev_token');
            login(data.user, token);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (pwData.newPassword !== pwData.confirmPassword) {
            return toast.error('New passwords do not match');
        }
        if (pwData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        setPwLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: pwData.currentPassword,
                newPassword: pwData.newPassword,
            });
            toast.success('Password changed successfully!');
            setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setActiveTab('profile');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password');
        } finally {
            setPwLoading(false);
        }
    };

    // Avatar initials
    const initials = (profileData?.name || user?.name || 'U')
        .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const memberSince = profileData?.created_at
        ? new Date(profileData.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : null;

    const vehicleIcon = VEHICLE_ICONS[formData.vehicle_type] || 'fa-car';

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '420px', height: 'auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3>My Account</h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
                </div>

                {/* Avatar + Info */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), #60a5fa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem', fontWeight: 700, color: '#fff', flexShrink: 0
                    }}>
                        {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profileData?.name || user?.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profileData?.email || user?.email}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${profileData?.role === 'admin' ? 'warning' : 'primary'}`} style={{ fontSize: '0.65rem' }}>
                                <i className={`fas fa-${profileData?.role === 'admin' ? 'shield-alt' : 'user'}`} style={{ marginRight: '3px' }} />
                                {profileData?.role || 'user'}
                            </span>
                            {formData.vehicle_type && (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.07)', fontSize: '0.65rem' }}>
                                    <i className={`fas ${vehicleIcon}`} style={{ marginRight: '3px' }} />
                                    {formData.vehicle_type}
                                </span>
                            )}
                            {memberSince && (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    <i className="fas fa-calendar-alt" style={{ marginRight: '3px' }} />
                                    Since {memberSince}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ padding: '0.75rem 1.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    {[
                        { id: 'profile', icon: 'fa-user', label: 'Profile' },
                        { id: 'password', icon: 'fa-lock', label: 'Password' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`fas ${tab.icon}`} style={{ marginRight: '0.4rem', fontSize: '0.8rem' }} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 ..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Vehicle Type</label>
                                <select
                                    className="input-field"
                                    value={formData.vehicle_type}
                                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Two-Wheeler">🏍️ Two-Wheeler</option>
                                    <option value="Car">🚗 Car</option>
                                    <option value="SUV">🚙 SUV</option>
                                    <option value="Other">🔌 Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit}>
                            <div style={{ padding: '0.75rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#fbbf24' }} />
                                Choose a strong password with at least 6 characters.
                            </div>
                            <div className="form-group">
                                <label>Current Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        className="input-field"
                                        value={pwData.currentPassword}
                                        onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })}
                                        required
                                        placeholder="Enter current password"
                                    />
                                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <i className={`fas fa-eye${showCurrentPw ? '-slash' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        className="input-field"
                                        value={pwData.newPassword}
                                        onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                                        required
                                        placeholder="At least 6 characters"
                                        minLength={6}
                                    />
                                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <i className={`fas fa-eye${showNewPw ? '-slash' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={pwData.confirmPassword}
                                    onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                                    required
                                    placeholder="Repeat new password"
                                />
                                {pwData.confirmPassword && pwData.newPassword !== pwData.confirmPassword && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                                        <i className="fas fa-exclamation-circle" style={{ marginRight: '4px' }} />
                                        Passwords do not match
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setActiveTab('profile')}>
                                    Back
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={pwLoading}>
                                    {pwLoading ? <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Changing...</> : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
