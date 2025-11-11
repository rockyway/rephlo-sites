import React, { Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  Home,
  Users,
  CreditCard,
  Key,
  Ticket,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Cpu,
  DollarSign,
  Receipt,
  TrendingUp,
  Calculator,
  LineChart,
  Calendar,
  Tag,
} from 'lucide-react';
import { useAdminUIStore } from '../../../stores/adminUIStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Billing', href: '/admin/billing', icon: Receipt },
  { name: 'Licenses', href: '/admin/licenses', icon: Key },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Coupon Analytics', href: '/admin/coupons/analytics', icon: Tag },
  { name: 'Campaign Calendar', href: '/admin/coupons/calendar', icon: Calendar },
  { name: 'Models', href: '/admin/models', icon: Cpu },
  { name: 'Margin Tracking', href: '/admin/profitability/margins', icon: TrendingUp },
  { name: 'Pricing Config', href: '/admin/profitability/pricing', icon: DollarSign },
  { name: 'Price Simulator', href: '/admin/profitability/simulator', icon: Calculator },
  { name: 'Vendor Prices', href: '/admin/profitability/vendor-prices', icon: LineChart },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

/**
 * AdminSidebar Component
 *
 * Collapsible sidebar with navigation menu.
 * Features:
 * - Desktop: Fixed position, persistent, collapsible
 * - Mobile: Headless UI Dialog (drawer) overlay
 * - Active route highlighting using useLocation
 * - Zustand integration for collapse state
 * - Keyboard accessible (Tab navigation, Escape closes)
 * - Deep Navy theme
 */
const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAdminUIStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Navigation link renderer
  const renderNavLink = (item: NavItem, collapsed: boolean = false) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${
            isActive
              ? 'bg-rephlo-blue text-white shadow-md'
              : 'text-deep-navy-600 hover:bg-deep-navy-100 hover:text-deep-navy-800'
          }
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${collapsed ? 'justify-center' : ''}
        `}
        aria-disabled={item.disabled}
        tabIndex={item.disabled ? -1 : 0}
      >
        <Icon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
        {!collapsed && <span className="font-medium">{item.name}</span>}
      </NavLink>
    );
  };

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside
      className={`
        hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col
        bg-white border-r border-deep-navy-200 shadow-sm
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}
    >
      {/* Logo & Collapse Toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-deep-navy-200">
        {!sidebarCollapsed && (
          <h1 className="text-xl font-bold text-rephlo-blue">Rephlo Admin</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-deep-navy-100 transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5 text-deep-navy-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-deep-navy-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigationItems.map((item) => renderNavLink(item, sidebarCollapsed))}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-deep-navy-200">
          <p className="text-xs text-deep-navy-500 text-center">
            Rephlo Admin v2.1.0
          </p>
        </div>
      )}
    </aside>
  );

  // Mobile Drawer Sidebar
  const MobileSidebar = () => (
    <Transition.Root show={mobileOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileOpen}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-deep-navy-900/80" />
        </Transition.Child>

        {/* Drawer */}
        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              {/* Close Button */}
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>

              {/* Sidebar Content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center border-b border-deep-navy-200">
                  <h1 className="text-xl font-bold text-rephlo-blue">Rephlo Admin</h1>
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-2">
                    {navigationItems.map((item) => (
                      <li key={item.href}>{renderNavLink(item)}</li>
                    ))}
                  </ul>
                </nav>

                {/* Footer */}
                <div className="border-t border-deep-navy-200 pt-4">
                  <p className="text-xs text-deep-navy-500 text-center">
                    Rephlo Admin v2.1.0
                  </p>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );

  // Expose mobile toggle for AdminHeader
  React.useEffect(() => {
    (window as any).__toggleMobileSidebar = () => setMobileOpen(true);
    return () => {
      delete (window as any).__toggleMobileSidebar;
    };
  }, []);

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
};

export default AdminSidebar;
