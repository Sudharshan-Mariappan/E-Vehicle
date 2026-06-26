import { createContext, useContext, useState, useEffect } from 'react';
import socket from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('ev_user');
        return stored ? JSON.parse(stored) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem('ev_token') || null);

    // Connect socket and join user room when logged in
    useEffect(() => {
        if (user && token) {
            if (!socket.connected) {
                socket.connect();
            }
            socket.emit('join_user_room', { userId: user.id });
        } else {
            if (socket.connected) {
                socket.disconnect();
            }
        }
    }, [user, token]);

    const login = (userData, authToken) => {
        localStorage.setItem('ev_token', authToken);
        localStorage.setItem('ev_user', JSON.stringify(userData));
        setToken(authToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('ev_token');
        localStorage.removeItem('ev_user');
        setToken(null);
        setUser(null);
        if (socket.connected) socket.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
