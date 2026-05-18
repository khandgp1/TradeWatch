import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
export function useSocket() {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        const socketInstance = io({
            path: '/socket.io',
            reconnectionDelayMax: 10000,
        });
        socketInstance.on('connect', () => {
            setIsConnected(true);
        });
        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });
        setSocket(socketInstance);
        return () => {
            socketInstance.disconnect();
        };
    }, []);
    return { socket, isConnected };
}
