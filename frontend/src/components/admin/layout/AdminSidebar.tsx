import React, { Fragment, useState, useEffect } from 'react';
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
  ChevronDown,
  X,
  Cpu,
  DollarSign,
  Receipt,
  TrendingUp,
  Calculator,
  LineChart,
  Calendar,
  Tag,
  Shield,
  AlertTriangle,
  Smartphone,
  Zap,
} from 'lucide-react';
import { useAdminUIStore } from '../../../stores/adminUIStore';

interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
  defaultExpanded?: boolean;
}

type NavigationItem = NavItem | NavGroup;

// Check if item is a group
function isNavGroup(item: NavigationItem): item is NavGroup {
  return 'children' in item;
}

// Navigation structure with nested groups
const navigationItems: NavigationItem[] = [
  // Dashboard (single item)
  { name: 'Dashboard', href: '/admin', icon: Home },

  // Users group
  {
    name: 'Users',
    icon: Users,
    defaultExpanded: false,
    children: [
      { name: 'User List', href: '/admin/users' },
    ],
  },

  // Subscriptions group
  {
    name: 'Subscriptions',
    icon: CreditCard,
    defaultExpanded: false,
    children: [
      { name: 'Subscription Management', href: '/admin/subscriptions' },
      { name: 'Billing Dashboard', href: '/admin/billing' },
      { name: 'Credit Management', href: '/admin/credits' },
    ],
  },

  // Licenses group
  {
    name: 'Licenses',
    icon: Key,
    defaultExpanded: false,
    children: [
      { name: 'License Management', href: '/admin/licenses' },
      { name: 'Device Activations', href: '/admin/licenses/devices' },
      { name: 'Proration Tracking', href: '/admin/licenses/prorations' },
    ],
  },

  // Coupons & Campaigns group
  {
    name: 'Coupons & Campaigns',
    icon: Ticket,
    defaultExpanded: false,
    children: [
      { name: 'Coupon Management', href: '/admin/coupons' },
      { name: 'Campaign Management', href: '/admin/coupons/campaigns' },
      { name: 'Campaign Calendar', href: '/admin/coupons/calendar' },
      { name: 'Coupon Analytics', href: '/admin/coupons/analytics' },
      { name: 'Fraud Detection', href: '/admin/coupons/fraud' },
    ],
  },

  // Profitability group
  {
    name: 'Profitability',
    icon: DollarSign,
    defaultExpanded: false,
    children: [
      { name: 'Margin Tracking', href: '/admin/profitability/margins' },
      { name: 'Pricing Configuration', href: '/admin/profitability/pricing' },
      { name: 'Pricing Simulator', href: '/admin/profitability/simulator' },
      { name: 'Vendor Price Monitoring', href: '/admin/profitability/vendor-prices' },
    ],
  },

  // Models group
  {
    name: 'Models',
    icon: Cpu,
    defaultExpanded: false,
    children: [
      { name: 'Model Tier Management', href: '/admin/models' },
    ],
  },

  // Analytics group
  {
    name: 'Analytics',
    icon: BarChart3,
    defaultExpanded: false,
    children: [
      { name: 'Platform Analytics', href: '/admin/analytics' },
      { name: 'Revenue Analytics', href: '/admin/analytics/revenue' },
    ],
  },

  // Settings group
  {
    name: 'Settings',
    icon: Settings,
    defaultExpanded: false,
    children: [
      { name: 'General', href: '/admin/settings#general' },
      { name: 'Email & Notifications', href: '/admin/settings#email' },
      { name: 'Security', href: '/admin/settings#security' },
      { name: 'Integrations', href: '/admin/settings#integrations' },
      { name: 'Feature Flags', href: '/admin/settings#features' },
      { name: 'System', href: '/admin/settings#system' },
    ],
  },
];

/**
 * AdminSidebar Component
 *
 * Collapsible sidebar with nested navigation menu.
 * Features:
 * - Desktop: Fixed position, persistent, collapsible
 * - Mobile: Headless UI Dialog (drawer) overlay
 * - Active route highlighting using useLocation
 * - Nested groups with expand/collapse state (persisted in localStorage)
 * - Zustand integration for sidebar collapse state
 * - Keyboard accessible (Tab navigation, Escape closes)
 * - Deep Navy theme
 */
const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAdminUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);
  const isRestoringScroll = React.useRef(false);

  // Expanded groups state (persisted in localStorage)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('admin-sidebar-expanded-groups');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load expanded groups from localStorage:', error);
    }
    // Default: Dashboard expanded
    return new Set(['Dashboard']);
  });

  // Persist expanded groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'admin-sidebar-expanded-groups',
        JSON.stringify(Array.from(expandedGroups))
      );
    } catch (error) {
      console.error('Failed to save expanded groups to localStorage:', error);
    }
  }, [expandedGroups]);

  // Restore scroll position on mount and after navigation
  useEffect(() => {
    if (navRef.current) {
      try {
        const savedScrollPos = localStorage.getItem('admin-sidebar-scroll-position');
        if (savedScrollPos) {
          isRestoringScroll.current = true;
          const scrollPos = parseInt(savedScrollPos, 10);

          // Use multiple timing strategies to ensure scroll is restored
          // Immediate attempt
          if (navRef.current) {
            navRef.current.scrollTop = scrollPos;
          }

          // Delayed attempt with requestAnimationFrame
          requestAnimationFrame(() => {
            if (navRef.current) {
              navRef.current.scrollTop = scrollPos;
            }
          });

          // Final attempt with setTimeout to catch late renders
          setTimeout(() => {
            if (navRef.current) {
              navRef.current.scrollTop = scrollPos;
            }
            isRestoringScroll.current = false;
          }, 50);
        }
      } catch (error) {
        console.error('Failed to restore scroll position:', error);
        isRestoringScroll.current = false;
      }
    }
  }, [location.pathname, location.hash]);

  // Save scroll position on scroll
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const handleScroll = () => {
      // Don't save scroll position while restoring to avoid conflicts
      if (isRestoringScroll.current) return;

      try {
        localStorage.setItem('admin-sidebar-scroll-position', navElement.scrollTop.toString());
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    };

    navElement.addEventListener('scroll', handleScroll);
    return () => {
      navElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-expand group if child is active
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (isNavGroup(item)) {
        const hasActiveChild = item.children.some(
          (child) => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
        );
        if (hasActiveChild && !expandedGroups.has(item.name)) {
          setExpandedGroups((prev) => new Set(prev).add(item.name));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Check if any child in group is active
  const isGroupActive = (group: NavGroup): boolean => {
    return group.children.some((child) => {
      const [pathPart, hashPart] = child.href.split('#');
      const currentHash = location.hash.replace('#', '');

      if (hashPart) {
        // Hash-based route: match both path and hash
        return location.pathname === pathPart && currentHash === hashPart;
      } else {
        // Regular route: match path or startsWith
        return location.pathname === child.href || location.pathname.startsWith(child.href + '/');
      }
    });
  };

  // Navigation link renderer (for single items)
  const renderNavLink = (item: NavItem, collapsed: boolean = false, isChild: boolean = false) => {
    // For Dashboard (/admin), use exact match to prevent it from always being active
    // For child items in a group, use exact match only (no startsWith)
    // This prevents sibling routes from both showing as active
    // For hash-based routes (e.g., /admin/settings#general), check both pathname and hash
    const [pathPart, hashPart] = item.href.split('#');
    const currentHash = location.hash.replace('#', '');

    let isActive = false;
    if (hashPart) {
      // Hash-based route: match both path and hash
      isActive = location.pathname === pathPart && currentHash === hashPart;
    } else if (item.href === '/admin') {
      // Dashboard: exact match only
      isActive = location.pathname === '/admin';
    } else if (isChild) {
      // Child items: exact match only (no startsWith)
      isActive = location.pathname === item.href;
    } else {
      // Other routes: match path or startsWith
      isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    }

    const Icon = item.icon;

    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        preventScrollReset={true}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${isChild ? 'pl-12 text-sm' : ''}
          ${
            isActive
              ? 'bg-rephlo-blue dark:bg-electric-cyan text-white dark:text-deep-navy-900 shadow-md'
              : 'text-deep-navy-600 dark:text-deep-navy-300 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800 hover:text-deep-navy-800 dark:hover:text-deep-navy-100'
          }
          ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${collapsed && !isChild ? 'justify-center' : ''}
        `}
        aria-disabled={item.disabled}
        tabIndex={item.disabled ? -1 : 0}
      >
        {Icon && <Icon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />}
        {!collapsed && <span className="font-medium">{item.name}</span>}
      </NavLink>
    );
  };

  // Navigation group renderer
  const renderNavGroup = (group: NavGroup, collapsed: boolean = false) => {
    const isExpanded = expandedGroups.has(group.name);
    const isActive = isGroupActive(group);
    const Icon = group.icon;

    return (
      <div key={group.name}>
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(group.name)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${
              isActive && !isExpanded
                ? 'bg-rephlo-blue/10 dark:bg-electric-cyan/10 text-rephlo-blue dark:text-electric-cyan'
                : 'text-deep-navy-600 dark:text-deep-navy-300 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800 hover:text-deep-navy-800 dark:hover:text-deep-navy-100'
            }
            ${collapsed ? 'justify-center' : 'justify-between'}
          `}
          aria-expanded={isExpanded}
        >
          <div className={`flex items-center gap-3 ${collapsed ? '' : 'flex-1'}`}>
            <Icon className={`flex-shrink-0 ${collapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
            {!collapsed && <span className="font-medium">{group.name}</span>}
          </div>
          {!collapsed && (
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {/* Group Children */}
        {isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {group.children.map((child) => renderNavLink(child, false, true))}
          </div>
        )}
      </div>
    );
  };

  // Main navigation renderer
  const renderNavigation = (collapsed: boolean = false) => {
    return navigationItems.map((item) => {
      if (isNavGroup(item)) {
        return renderNavGroup(item, collapsed);
      } else {
        return renderNavLink(item, collapsed, false);
      }
    });
  };

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside
      className={`
        hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col
        bg-white dark:bg-deep-navy-900 border-r border-deep-navy-200 dark:border-deep-navy-700 shadow-sm
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[306px]'}
      `}
    >
      {/* Logo & Collapse Toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-deep-navy-200 dark:border-deep-navy-700">
        {!sidebarCollapsed && (
          <h1 className="text-xl font-bold text-rephlo-blue dark:text-electric-cyan">Rephlo Admin</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800 transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5 text-deep-navy-600 dark:text-deep-navy-300" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-deep-navy-600 dark:text-deep-navy-300" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {renderNavigation(sidebarCollapsed)}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-deep-navy-200 dark:border-deep-navy-700">
          <div className="text-xs text-deep-navy-700 dark:text-deep-navy-300 text-center space-y-1">
            <p>Rephlo Admin v2.1.0</p>
            {import.meta.env.MODE !== 'production' && (
              <p className="font-mono text-[10px] text-deep-navy-600 dark:text-deep-navy-400">
                {__GIT_BRANCH__} • {__GIT_COMMIT__}
              </p>
            )}
          </div>
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
          <div className="fixed inset-0 bg-deep-navy-900/80 dark:bg-deep-navy-950/90" />
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
                    <X className="h-6 w-6 text-white dark:text-deep-navy-200" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>

              {/* Sidebar Content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-deep-navy-900 px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center border-b border-deep-navy-200 dark:border-deep-navy-700">
                  <h1 className="text-xl font-bold text-rephlo-blue dark:text-electric-cyan">Rephlo Admin</h1>
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-y-2">
                    {renderNavigation(false)}
                  </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-deep-navy-200 dark:border-deep-navy-700 pt-4">
                  <div className="text-xs text-deep-navy-700 dark:text-deep-navy-300 text-center space-y-1">
                    <p>Rephlo Admin v2.1.0</p>
                    {import.meta.env.MODE !== 'production' && (
                      <p className="font-mono text-[10px] text-deep-navy-600 dark:text-deep-navy-400">
                        {__GIT_BRANCH__} • {__GIT_COMMIT__}
                      </p>
                    )}
                  </div>
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
