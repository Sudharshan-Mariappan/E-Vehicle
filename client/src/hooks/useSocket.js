import { useEffect, useRef } from 'react';
import socket from '../services/socket';

/**
 * useSocket hook
 * Provides a convenient way to listen to Socket.io events.
 * Automatically cleans up listeners on unmount.
 *
 * @param {string}   event    - Socket.io event name to listen to
 * @param {Function} handler  - Callback function for the event
 * @param {Array}    deps     - Dependencies array (like useEffect)
 */
const useSocket = (event, handler, deps = []) => {
    const handlerRef = useRef(handler);

    // Keep handler ref up to date without re-subscribing
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const listener = (...args) => handlerRef.current(...args);
        socket.on(event, listener);

        return () => {
            socket.off(event, listener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, ...deps]);
};

export default useSocket;
