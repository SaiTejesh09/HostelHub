import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  // Auto-connect socket & hydrate unread count on every dashboard page
  useRealtimeNotifications();

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <main>{children}</main>
      </div>
    </div>
  );
}
