import axios from 'axios';

// Axios instance pointing to backend (proxied via Vite in dev)
const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ev_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally — clear token and reload
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('ev_token');
            localStorage.removeItem('ev_user');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default api;
