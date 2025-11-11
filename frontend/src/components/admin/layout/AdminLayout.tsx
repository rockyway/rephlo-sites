import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAdminUIStore } from '../../../stores/adminUIStore';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

/**
 * AdminLayout Component
 *
 * Main layout wrapper for the admin dashboard.
 * Features:
 * - Responsive layout adjusting to sidebar state
 * - Mobile: Full-width with drawer sidebar
 * - Desktop: Offset main content when sidebar expanded
 * - Deep Navy theme
 */
const AdminLayout: React.FC = () => {
  const sidebarCollapsed = useAdminUIStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-deep-navy-50 dark:bg-deep-navy-950">
      {/* Sidebar - conditionally rendered based on screen size */}
      <AdminSidebar />

      {/* Main content area with offset for desktop sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[306px]'
        }`}
      >
        {/* Header */}
        <AdminHeader />

        {/* Main content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
