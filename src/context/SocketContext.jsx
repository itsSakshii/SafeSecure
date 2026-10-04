import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => { setConnected(true); console.log('Socket connected:', socket.id); });
    socket.on('disconnect', () => { setConnected(false); });
    socket.on('pong', () => {});

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  const emit = (event, data) => { socketRef.current?.emit(event, data); };
  const on = (event, handler) => { socketRef.current?.on(event, handler); };
  const off = (event, handler) => { socketRef.current?.off(event, handler); };
  const joinRoom = (room) => { socketRef.current?.emit('join_incident', { incidentId: room }); };
  const joinGuardRoom = (guardId) => { socketRef.current?.emit('join_guard_room', { guardId }); };
  const joinUserRoom = (userId) => { socketRef.current?.emit('join_user_room', { userId }); };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on, off, joinRoom, joinGuardRoom, joinUserRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
