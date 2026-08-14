import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { connectSocket, isSocketConnected } from '../lib/socket';
import api from '../lib/api';

/**
 * Hook that auto-connects socket and fetches unread notification count
 * on mount. Drop this into DashboardLayout so every authenticated page
 * has realtime notifications running.
 */
export function useRealtimeNotifications() {
  const { accessToken } = useAuthStore();
  const { setUnreadCount } = useNotificationStore();

  // Auto-connect socket when token is available
  useEffect(() => {
    if (accessToken && !isSocketConnected()) {
      connectSocket();
    }
  }, [accessToken]);

  // Fetch unread count on mount (hydrate badge immediately)
  useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      const count = res.data?.data?.count ?? 0;
      setUnreadCount(count);
      return count;
    },
    enabled: !!accessToken,
    staleTime: 30_000, // refetch every 30s max
    refetchInterval: 60_000, // poll every 60s as fallback
    refetchOnWindowFocus: true,
  });
}
