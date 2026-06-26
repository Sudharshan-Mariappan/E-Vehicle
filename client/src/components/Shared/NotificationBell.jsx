import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import useSocket from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter(n => !n.read).length);
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        const handleRefresh = () => fetchNotifications();
        window.addEventListener('notification_refresh', handleRefresh);
        return () => window.removeEventListener('notification_refresh', handleRefresh);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useSocket('slot_assigned', fetchNotifications);
    useSocket('queue_position_updated', fetchNotifications);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { /* silent */ }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            toast.error('Failed to mark all as read');
        }
    };

    const deleteNotification = async (e, id) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id);
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
            });
        } catch {
            toast.error('Failed to delete notification');
        }
    };

    const clearAll = async () => {
        try {
            await api.delete('/notifications/clear-all');
            setNotifications([]);
            setUnreadCount(0);
        } catch {
            toast.error('Failed to clear notifications');
        }
    };

    const getNotifIcon = (message) => {
        if (message?.includes('slot') || message?.includes('Slot')) return { icon: 'fa-bolt', color: 'var(--primary)' };
        if (message?.includes('queue') || message?.includes('Queue')) return { icon: 'fa-users', color: 'var(--warning)' };
        if (message?.includes('complete') || message?.includes('Complete')) return { icon: 'fa-check-circle', color: 'var(--success)' };
        return { icon: 'fa-bell', color: 'var(--text-muted)' };
    };

    return (
        <div className="notification-bell" ref={dropdownRef} style={{ position: 'relative', marginRight: '1rem' }}>
            <button
                className="btn btn-ghost btn-circle"
                onClick={() => setIsOpen(!isOpen)}
                style={{ position: 'relative' }}
            >
                <i className="fas fa-bell" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }} />
                {unreadCount > 0 && (
                    <span className="badge badge-danger" style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.6rem',
                        borderRadius: '50%',
                        minWidth: '18px',
                        textAlign: 'center'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="dropdown-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '340px',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '420px'
                }}>
                    {/* Header */}
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span className="badge badge-primary" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>{unreadCount} new</span>
                            )}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {unreadCount > 0 && (
                                <button className="btn-link" style={{ fontSize: '0.72rem', color: 'var(--primary)' }} onClick={markAllAsRead}>
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button className="btn-link" style={{ fontSize: '0.72rem', color: 'var(--danger)' }} onClick={clearAll}>
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <i className="fas fa-bell-slash" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem', opacity: 0.3 }} />
                                No notifications
                            </div>
                        ) : (
                            notifications.map(n => {
                                const { icon, color } = getNotifIcon(n.message);
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.read && markAsRead(n.id)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            background: n.read ? 'transparent' : 'rgba(0,212,170,0.05)',
                                            cursor: n.read ? 'default' : 'pointer',
                                            transition: 'background 0.2s',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.6rem'
                                        }}
                                        className="notification-item"
                                    >
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: `${color}20`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
                                        }}>
                                            <i className={`fas ${icon}`} style={{ fontSize: '0.7rem', color }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.82rem', marginBottom: '0.2rem', color: n.read ? 'var(--text-muted)' : '#e2e8f0', lineHeight: 1.4 }}>
                                                {n.message}
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                                                {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={(e) => deleteNotification(e, n.id)}
                                            style={{ flexShrink: 0, opacity: 0.4, padding: '2px 6px' }}
                                            title="Delete"
                                        >
                                            <i className="fas fa-times" style={{ fontSize: '0.65rem' }} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
