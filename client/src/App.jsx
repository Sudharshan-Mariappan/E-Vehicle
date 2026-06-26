import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import StationList from './components/Station/StationList';
import StationDetail from './components/Station/StationDetail';
import FavoritesView from './components/Station/FavoritesView';
import ActiveSession from './components/Booking/ActiveSession';
import QueueView from './components/Booking/QueueView';
import SessionHistory from './components/Session/SessionHistory';
import NotificationBell from './components/Shared/NotificationBell';
import ProfileModal from './components/Auth/ProfileModal';
import WalletModal from './components/Wallet/WalletModal';
import AdminDashboard from './components/Admin/AdminDashboard';
import SlotOfferDialog from './components/Booking/SlotOfferDialog';
import MapView, { loadGoogleMaps } from './components/Map/MapView';
import useGeolocation from './hooks/useGeolocation';
import useSocket from './hooks/useSocket';
import toast from 'react-hot-toast';
import api from './services/api';
import AvailabilityBanner from './components/Station/AvailabilityBanner';

// ── Inner app (requires auth context) ────────────────────────────────────────
const MainApp = () => {
    const { user, logout } = useAuth();
    const userLocation = useGeolocation();
    const [selectedStation, setSelectedStation] = useState(null);
    const [stations, setStations] = useState([]);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [sessionKey, setSessionKey] = useState(0);
    const [currentView, setCurrentView] = useState('stations'); // 'stations' | 'history' | 'favorites' | 'queue' | 'admin'
    const [queueCount, setQueueCount] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [favorites, setFavorites] = useState(new Set()); // Set of station IDs
    const [walletBalance, setWalletBalance] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('ev_theme') || 'dark');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [slotOffer, setSlotOffer] = useState(null);
    const [directionTarget, setDirectionTarget] = useState(null);
    const [directionsInfo, setDirectionsInfo] = useState(null);

    // Apply theme on change
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ev_theme', theme);
    }, [theme]);

    // Load favorites on mount
    useEffect(() => {
        if (user) {
            api.get('/favorites').then(({ data }) => {
                setFavorites(new Set(data.favorites.map(f => f.id)));
            }).catch(() => { });
        }
    }, [user]);

    // Load wallet balance on mount
    useEffect(() => {
        if (user) {
            api.get('/wallet').then(({ data }) => {
                setWalletBalance(data.balance);
            }).catch(() => { });
        }
    }, [user]);

    // Load queue count on mount
    useEffect(() => {
        if (user) {
            api.get('/queue/my-queues').then(({ data }) => {
                setQueueCount((data.queues || []).length);
            }).catch(() => { });
        }
    }, [user]);

    const handleToggleFavorite = useCallback(async (stationId) => {
        try {
            const { data } = await api.post(`/favorites/${stationId}`);

            setFavorites(prev => {
                const newFavs = new Set(prev);
                if (data.favorited) {
                    newFavs.add(stationId);
                } else {
                    newFavs.delete(stationId);
                }
                return newFavs;
            });
            toast.success(data.message, { icon: data.favorited ? '❤️' : '💔' });
        } catch (err) {
            toast.error('Failed to update favorite');
        }
    }, []);

    // Load Google Maps script on mount
    useEffect(() => {
        loadGoogleMaps()
            .then(() => setMapsLoaded(true))
            .catch(() => setMapsLoaded(true));
    }, []);

    // Real-time: slot assigned to ME from queue
    useSocket('slot_assigned', ({ message, bookingId }) => {
        toast.success(message || '🎉 A slot has been assigned to you! Your booking is now active.', {
            duration: 10000,
            icon: '⚡',
        });
        setSessionKey((k) => k + 1); // refresh active session panel
        setQueueCount(0); // clear queue badge
        // Refresh notifications count
        api.get('/queue/my-queues').then(({ data }) => {
            setQueueCount((data.queues || []).length);
        }).catch(() => { });
    });

    // Real-time: queue position update
    useSocket('queue_position_updated', ({ position, stationId }) => {
        if (position) {
            toast(`📍 Queue update: You're now #${position} in line`, { icon: '🔔', duration: 4000 });
        }
    });

    // Real-time: slot offered to ME from queue
    useSocket('slot_offered', (offer) => {
        setSlotOffer(offer);
    });

    // Real-time: general system notifications
    useSocket('notification_received', (notif) => {
        const { message, type } = notif;
        if (type === 'success') toast.success(message);
        else if (type === 'warning') toast.error(message);
        else toast(message);

        // Notify the bell to refresh
        window.dispatchEvent(new CustomEvent('notification_refresh'));
    });

    const handleAcceptOffer = useCallback(async () => {
        if (!slotOffer) return;
        try {
            await api.post('/queue/accept-offer', { queueId: slotOffer.queueId });
            setSlotOffer(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to accept offer');
        }
    }, [slotOffer]);

    const handleDeclineOffer = useCallback(async () => {
        if (!slotOffer) return;
        try {
            await api.post('/queue/decline-offer', { queueId: slotOffer.queueId });
            setSlotOffer(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to decline offer');
        }
    }, [slotOffer]);

    const handleBookingCreated = useCallback(() => {
        setSessionKey((k) => k + 1);
    }, []);

    const handleSessionCompleted = useCallback(() => {
        setSessionKey((k) => k + 1);
        setSelectedStation(null);
        // Refresh wallet balance after session completes
        api.get('/wallet').then(({ data }) => setWalletBalance(data.balance)).catch(() => { });
    }, []);

    const handleWalletClose = useCallback(() => {
        setShowWalletModal(false);
        // Refresh wallet balance when modal closes
        api.get('/wallet').then(({ data }) => setWalletBalance(data.balance)).catch(() => { });
    }, []);

    if (!mapsLoaded) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading EV Charge Finder...</p>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-brand">
                    <button
                        className="btn btn-ghost btn-circle mobile-menu-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{ display: 'none' }} // Managed by CSS
                    >
                        <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`} />
                    </button>
                    <i className="fas fa-charging-station" />
                    <span>EV Charge Finder</span>
                </div>
                <nav className={`header-nav ${isMobileMenuOpen ? 'open' : ''}`}>
                    {userLocation.loading ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <i className="fas fa-location-dot" style={{ marginRight: '4px' }} />
                            Locating...
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <i className="fas fa-location-dot" style={{ marginRight: '4px', color: 'var(--primary)' }} />
                            {userLocation.address}
                        </span>
                    )}
                    {/* Notifications */}
                    <NotificationBell />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <i className="fas fa-user" style={{ marginRight: '4px' }} />
                            {user?.name}
                        </span>
                        <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setShowProfileModal(true)}
                            title="Edit Profile"
                        >
                            <i className="fas fa-pen" style={{ fontSize: '0.7rem' }} />
                        </button>
                    </div>

                    {/* Wallet Balance */}
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowWalletModal(true)}
                        style={{ marginRight: '0.5rem', color: 'var(--success)' }}
                        title="Open Wallet"
                    >
                        <i className="fas fa-wallet" style={{ marginRight: '0.5rem' }} />
                        {walletBalance !== null ? `₹${walletBalance.toFixed(0)}` : 'Wallet'}
                    </button>

                    {/* Favorites Button */}
                    <button
                        className={`btn btn-sm ${currentView === 'favorites' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCurrentView(currentView === 'favorites' ? 'stations' : 'favorites')}
                        style={{ marginRight: '0.5rem', position: 'relative' }}
                        title="My Favorites"
                    >
                        <i className="fas fa-heart" style={{ color: currentView === 'favorites' ? undefined : 'var(--danger)', marginRight: favorites.size > 0 ? '0.4rem' : 0 }} />
                        {favorites.size > 0 && (
                            <span style={{ fontSize: '0.75rem' }}>{favorites.size}</span>
                        )}
                    </button>

                    {/* Queue Button */}
                    <button
                        className={`btn btn-sm ${currentView === 'queue' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCurrentView(currentView === 'queue' ? 'stations' : 'queue')}
                        style={{ marginRight: '0.5rem', position: 'relative' }}
                        title="My Queue Positions"
                    >
                        <i className="fas fa-users" style={{ color: currentView === 'queue' ? undefined : 'var(--warning)', marginRight: queueCount > 0 ? '0.4rem' : 0 }} />
                        {queueCount > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>{queueCount}</span>
                        )}
                    </button>

                    {user?.role === 'admin' && (
                        <button
                            className={`btn btn-sm ${currentView === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setCurrentView('admin')}
                            style={{ marginRight: '0.5rem' }}
                        >
                            <i className="fas fa-shield-alt" /> Admin
                        </button>
                    )}

                    <button
                        className={`btn btn-sm ${currentView === 'history' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setCurrentView(currentView === 'history' ? 'stations' : 'history'); setIsMobileMenuOpen(false); }}
                    >
                        <i className="fas fa-history" /> History
                    </button>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 0.5rem' }} />
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title="Toggle Theme"
                        style={{ padding: '0 0.5rem' }}
                    >
                        <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`} style={{ fontSize: '1rem', color: theme === 'dark' ? '#fbbf24' : '#64748b' }} />
                    </button>

                    <button className="btn btn-ghost btn-sm" onClick={logout}>
                        <i className="fas fa-sign-out-alt" /> Logout
                    </button>
                </nav>
            </header>

            {/* Main layout: sidebar + map */}
            <div className="main-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    {/* Active session (if any) */}
                    <ActiveSession key={sessionKey} onSessionCompleted={handleSessionCompleted} />

                    {/* Main Sidebar Content */}
                    {currentView === 'admin' ? (
                        <AdminDashboard onBack={() => setCurrentView('stations')} />
                    ) : currentView === 'history' ? (
                        <SessionHistory onBack={() => setCurrentView('stations')} />
                    ) : currentView === 'queue' ? (
                        <QueueView onBack={() => setCurrentView('stations')} />
                    ) : currentView === 'favorites' ? (
                        <FavoritesView
                            onBack={() => setCurrentView('stations')}
                            onSelectStation={(station) => {
                                setSelectedStation(station);
                                setDirectionTarget(null);
                                setDirectionsInfo(null);
                                setCurrentView('stations');
                            }}
                            onToggleFavorite={handleToggleFavorite}
                            favorites={favorites}
                        />
                    ) : (
                        <>
                            <AvailabilityBanner stations={stations} />
                            <StationList
                                userLocation={userLocation}
                                selectedStation={selectedStation}
                                onSelectStation={(station) => {
                                    setSelectedStation(station);
                                    setDirectionTarget(null);
                                    setDirectionsInfo(null);
                                }}
                                onStationsLoaded={setStations}
                                favorites={favorites}
                                onToggleFavorite={handleToggleFavorite}
                            />
                        </>
                    )}

                </aside>

                {/* Map */}
                <div className="map-container">
                    <MapView
                        userLocation={userLocation}
                        stations={stations}
                        onSelectStation={(station) => {
                            setSelectedStation(station);
                            setDirectionTarget(null);
                            setDirectionsInfo(null);
                        }}
                        onSetLocation={userLocation.setManualLocation}
                        directionTarget={directionTarget}
                        onRouteCalculated={setDirectionsInfo}
                    />
                </div>
            </div>

            {/* Station detail modal overlay */}
            {selectedStation && (
                <div className="modal-overlay" onClick={() => setSelectedStation(null)}>
                    <div className="modal" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <StationDetail
                            station={selectedStation}
                            onClose={() => setSelectedStation(null)}
                            onBookingCreated={handleBookingCreated}
                            isFavorite={favorites.has(selectedStation.id)}
                            onToggleFavorite={() => handleToggleFavorite(selectedStation.id)}
                            onGetDirections={() => setDirectionTarget(selectedStation)}
                            directionsInfo={directionsInfo}
                        />
                    </div>
                </div>
            )}

            {/* Modals */}
            {showProfileModal && (
                <ProfileModal onClose={() => setShowProfileModal(false)} />
            )}
            {showWalletModal && (
                <WalletModal onClose={handleWalletClose} />
            )}
            {slotOffer && (
                <SlotOfferDialog
                    offer={slotOffer}
                    onAccept={handleAcceptOffer}
                    onDecline={handleDeclineOffer}
                />
            )}
        </div>
    );
};

// ── Root App with providers ───────────────────────────────────────────────────
const App = () => {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1a1f2e',
                        color: '#e2e8f0',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                    },
                    success: { iconTheme: { primary: '#22c55e', secondary: '#1a1f2e' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#1a1f2e' } },
                }}
            />
            <AppContent />
        </AuthProvider>
    );
};

const AppContent = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <MainApp /> : <AuthPage />;
};

export default App;
