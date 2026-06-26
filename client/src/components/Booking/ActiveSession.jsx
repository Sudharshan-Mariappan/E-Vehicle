import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ActiveSession = ({ onSessionCompleted }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data } = await api.get('/sessions/active');
                setSession(data.activeSession);
                if (data.activeSession && data.activeSession.start_time) {
                    const startTime = new Date(data.activeSession.start_time);
                    const now = new Date();
                    const diff = Math.floor((now - startTime) / 1000);
                    setElapsed(isNaN(diff) ? 0 : diff);
                }
            } catch (err) {
                console.error('Failed to fetch active session:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, []);

    useEffect(() => {
        if (!session) return;
        timerRef.current = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [session]);

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return "00:00:00";
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleComplete = async () => {
        if (!session) return;
        setCompleting(true);
        try {
            const hours = elapsed / 3600;
            const energyConsumed = parseFloat((session.power_kw * hours).toFixed(3));
            const { data } = await api.put(`/bookings/${session.id}/complete`, { energyConsumed });
            toast.success(`✅ Session complete! Total: ₹${data.totalCost.toFixed(2)}`);
            clearInterval(timerRef.current);
            setSession(null);
            onSessionCompleted();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to complete session');
        } finally {
            setCompleting(false);
        }
    };

    const handleCancel = async () => {
        if (!session) return;
        setCancelling(true);
        try {
            await api.put(`/bookings/${session.id}/cancel`);
            toast.success('Booking cancelled');
            clearInterval(timerRef.current);
            setSession(null);
            setShowCancelConfirm(false);
            onSessionCompleted();
        } catch (err) {
            toast.error('Failed to cancel booking');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return null;
    if (!session) return null;

    const power_kw = parseFloat(session?.power_kw) || 0;
    const price_per_kwh = parseFloat(session?.price_per_kwh) || 0;
    const hours = isNaN(elapsed) ? 0 : elapsed / 3600;
    const energyConsumedValue = power_kw * hours;
    const energyConsumedFormatted = isNaN(energyConsumedValue) ? "0.00" : energyConsumedValue.toFixed(2);
    const estimatedCostValue = parseFloat(energyConsumedFormatted) * price_per_kwh;
    const estimatedCostFormatted = isNaN(estimatedCostValue) ? "0.00" : estimatedCostValue.toFixed(2);

    // Progress: assume max session is 2 hours for the bar
    const maxSeconds = 2 * 3600;
    const progressPct = Math.min((elapsed / maxSeconds) * 100, 100);

    return (
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i className="fas fa-bolt" style={{ color: 'var(--primary)', marginRight: '0.4rem' }} />
                Active Session
            </div>
            <div className="active-session-card">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{session?.station_name || 'Loading...'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {session?.slot_name || 'Slot'} · {session?.connector_type || 'Charging'} · {power_kw} kW
                </div>

                {/* Timer */}
                <div className="session-timer">{formatTime(elapsed)}</div>

                {/* Progress bar */}
                <div style={{ margin: '0.6rem 0', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: 'linear-gradient(90deg, var(--primary), #60a5fa)',
                        borderRadius: '4px',
                        transition: 'width 1s linear'
                    }} />
                </div>

                {/* Energy & Cost stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Energy</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{energyConsumedFormatted} kWh</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Cost</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success)' }}>₹{estimatedCostFormatted}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Power</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{power_kw} kW</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={handleComplete} disabled={completing}>
                        {completing ? <span className="spinner" /> : <i className="fas fa-check" />}
                        Complete
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowCancelConfirm(true)} title="Cancel booking">
                        <i className="fas fa-times" />
                    </button>
                </div>

                {showCancelConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up border border-red-100 dark:border-red-900/30 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-exclamation-triangle text-xl" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cancel Booking?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                Are you sure you want to cancel this active booking? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
                                    No, keep it
                                </button>
                                <button className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-colors flex items-center justify-center gap-2" onClick={handleCancel} disabled={cancelling}>
                                    {cancelling ? <span className="spinner spinner-sm" /> : <i className="fas fa-times" />}
                                    {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveSession;
