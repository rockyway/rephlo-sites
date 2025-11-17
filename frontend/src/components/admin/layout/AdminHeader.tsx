import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { ChevronRight, Menu as MenuIcon, Search, User, LogOut } from 'lucide-react';
import { useAdminUIStore } from '../../../stores/adminUIStore';
import ThemeToggle from '@/components/common/ThemeToggle';
import { authHelpers } from '@/services/api';
import { revokeToken } from '@/utils/oauth';

/**
 * AdminHeader Component
 *
 * Header with breadcrumbs, search, and user menu.
 * Features:
 * - Breadcrumbs (auto-generated from Zustand state)
 * - Global search (placeholder for now - just UI)
 * - User menu (Headless UI Menu) with profile, logout
 * - Mobile: Hamburger menu button to toggle sidebar
 * - Keyboard accessible
 * - Deep Navy theme
 */
const AdminHeader: React.FC = () => {
  const breadcrumbs = useAdminUIStore((state) => state.breadcrumbs);

  // Toggle mobile sidebar
  const handleMobileMenuClick = () => {
    if ((window as any).__toggleMobileSidebar) {
      (window as any).__toggleMobileSidebar();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Get tokens before clearing
      const accessToken = authHelpers.getAccessToken();
      const refreshToken = authHelpers.getRefreshToken();

      // Revoke tokens on the server
      if (accessToken) {
        await revokeToken(accessToken);
      }
      if (refreshToken) {
        await revokeToken(refreshToken);
      }

      // Clear local auth data
      authHelpers.clearAuth('user_logout');

      // Redirect to identity provider logout to clear session cookies
      // Then redirect back to login page
      const idpLogoutUrl = 'http://localhost:7151/logout';
      const postLogoutRedirectUri = encodeURIComponent('http://localhost:7052/login');
      window.location.href = `${idpLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirectUri}`;
    } catch (error) {
      console.error('Logout error:', error);
      // Even if token revocation fails, clear local auth and redirect to IDP logout
      authHelpers.clearAuth('user_logout_with_error');
      const idpLogoutUrl = 'http://localhost:7151/logout';
      const postLogoutRedirectUri = encodeURIComponent('http://localhost:7052/login');
      window.location.href = `${idpLogoutUrl}?post_logout_redirect_uri=${postLogoutRedirectUri}`;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-deep-navy-900 border-b border-deep-navy-200 dark:border-deep-navy-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Mobile Hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800 transition-colors"
            onClick={handleMobileMenuClick}
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-6 h-6 text-deep-navy-600 dark:text-deep-navy-300" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-deep-navy-400 dark:text-deep-navy-500" aria-hidden="true" />
                )}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-300 hover:text-rephlo-blue dark:hover:text-electric-cyan transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-deep-navy-800 dark:text-deep-navy-200">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right: Search + Theme Toggle + User Menu */}
        <div className="flex items-center gap-4">
          {/* Global Search (Placeholder) */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-deep-navy-600 dark:text-deep-navy-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              disabled
              className="pl-10 pr-4 py-2 w-64 border border-deep-navy-200 dark:border-deep-navy-700 rounded-lg bg-deep-navy-50 dark:bg-deep-navy-800 text-sm text-deep-navy-700 dark:text-deep-navy-200 placeholder-deep-navy-600 dark:placeholder-deep-navy-400 focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-transparent transition-all disabled:cursor-not-allowed"
              aria-label="Global search"
            />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <Menu as="div" className="relative">
            {({ open }) => (
              <>
                <Menu.Button
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-rephlo-blue dark:bg-electric-cyan flex items-center justify-center">
                    <User className="w-5 h-5 text-white dark:text-deep-navy-900" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                    Admin
                  </span>
                </Menu.Button>

                {open && (
                  <Menu.Items
                    static
                    className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-deep-navy-800 shadow-lg ring-1 ring-deep-navy-200 dark:ring-deep-navy-700 focus:outline-none"
                  >
                    <div className="p-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? 'bg-deep-navy-100 dark:bg-deep-navy-700' : ''
                            } flex items-center gap-2 w-full px-4 py-2 text-sm text-deep-navy-700 dark:text-deep-navy-200 rounded-md transition-colors`}
                            onClick={() => {
                              // TODO: Navigate to profile
                              console.log('Navigate to profile');
                            }}
                          >
                            <User className="w-4 h-4" />
                            <span>Profile</span>
                          </button>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? 'bg-deep-navy-100 dark:bg-deep-navy-700' : ''
                            } flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 rounded-md transition-colors`}
                            onClick={handleLogout}
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
