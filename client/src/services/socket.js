import { io } from 'socket.io-client';

// Connect to backend Socket.io server
// In dev, Vite proxies /socket.io to localhost:5000
const socket = io('/', {
    autoConnect: false,       // We connect manually after login
    transports: ['websocket', 'polling'],
    withCredentials: true,
});

export default socket;
