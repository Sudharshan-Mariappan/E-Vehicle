import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AuthPage = () => {
    const { login } = useAuth();
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '', vehicle_type: ''
    });

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
            const payload = tab === 'login'
                ? { email: form.email, password: form.password }
                : form;

            const { data } = await api.post(endpoint, payload);
            login(data.user, data.token);
            toast.success(data.message || 'Welcome!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <i className="fas fa-charging-station" />
                    <h1>EV Charge Finder</h1>
                    <p>Find & book EV charging slots near you</p>
                </div>

                <div className="auth-tabs">
                    <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
                        Login
                    </button>
                    <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {tab === 'register' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone (optional)</label>
                                <input className="form-input" name="phone" placeholder="10-digit mobile number" value={form.phone} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vehicle Type</label>
                                <select className="form-input" name="vehicle_type" value={form.vehicle_type} onChange={handleChange}>
                                    <option value="">Select vehicle type</option>
                                    <option>Two-Wheeler</option>
                                    <option>Car</option>
                                    <option>SUV</option>
                                    <option>Bus</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <span className="spinner" /> : null}
                        {tab === 'login' ? 'Login' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;
