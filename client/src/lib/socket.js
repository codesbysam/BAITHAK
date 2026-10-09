import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://baithak-api-1vzs.onrender.com';

let socketInstance = null;

/**
 * Initializes and returns a singleton socket instance with joinToken authentication.
 */
export function getSocket(token) {
  if (socketInstance) {
    if (token && socketInstance.auth?.token !== token) {
      socketInstance.disconnect();
      socketInstance = null;
    } else {
      return socketInstance;
    }
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,
  });

  return socketInstance;
}

/**
 * Disconnects and destroys the current socket connection.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
