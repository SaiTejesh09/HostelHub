import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      // If server disconnects us, attempt manual reconnect
      if (reason === 'io server disconnect') {
        socket?.connect();
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttempts = attempt;
      console.log(`🔌 Socket reconnecting... attempt ${attempt}`);
    });

    socket.on('reconnect', () => {
      console.log('🔌 Socket reconnected successfully');
      reconnectAttempts = 0;
    });

    socket.on('reconnect_failed', () => {
      console.error('🔌 Socket reconnection failed after max attempts');
    });

    // ── Notification Events ──
    socket.on('notification:new', (notification) => {
      useNotificationStore.getState().addNotification(notification);
      // Show real-time toast popup
      import('react-hot-toast').then(({ default: toast }) => {
        toast(notification.title || 'New notification', {
          icon: '🔔',
          duration: 5000,
          style: {
            background: '#fff',
            border: '1px solid #2b7fc4',
            borderLeft: '4px solid #2b7fc4',
            borderRadius: '12px',
            fontSize: '14px',
          },
        });
      });
    });

    socket.on('notification:unread_count', ({ count }: { count: number }) => {
      useNotificationStore.getState().setUnreadCount(count);
    });

    // ── Issue Events ──
    socket.on('issue:status_updated', (data: { issueId: string; title: string; status: string }) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast(`🔧 Issue "${data.title}" → ${data.status.replace('_', ' ')}`, {
          duration: 6000,
          style: { background: '#fff', border: '1px solid #f59e0b', borderLeft: '4px solid #f59e0b', borderRadius: '12px', fontSize: '13px' },
        });
      });
    });

    socket.on('issue:new_response', (data: { issueId: string; title: string; message: string }) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast(`💬 New response on "${data.title}"`, {
          duration: 5000,
          style: { background: '#fff', border: '1px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderRadius: '12px', fontSize: '13px' },
        });
      });
    });

    // ── Attendance Events ──
    socket.on('attendance:marked', (data: { mealType: string; scannedAt: string }) => {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(`✅ ${data.mealType} attendance marked!`, { duration: 4000 });
      });
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

export function joinRoom(roomId: string): void {
  getSocket().emit('chat:join_room', { roomId });
}

export function leaveRoom(roomId: string): void {
  getSocket().emit('chat:leave_room', { roomId });
}

export function sendChatMessage(roomId: string, message: string): void {
  getSocket().emit('chat:message', { roomId, message });
}

export function emitTyping(roomId: string): void {
  getSocket().emit('chat:typing', { roomId });
}

