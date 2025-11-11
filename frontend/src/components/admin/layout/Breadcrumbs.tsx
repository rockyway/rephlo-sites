/**
 * Breadcrumbs Component
 *
 * Displays breadcrumb navigation for admin pages
 *
 * Features:
 * - Auto-generates breadcrumbs from pathname (using generateBreadcrumbs utility)
 * - Manual breadcrumb override support (items prop)
 * - Clickable links for all items except current page
 * - Home icon for Admin root
 * - Responsive design
 * - Accessible (ARIA labels, keyboard navigation)
 * - Deep Navy theme
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BreadcrumbItem, generateBreadcrumbs } from '../../../utils/breadcrumbs';

interface BreadcrumbsProps {
  /**
   * Manual breadcrumb items (optional)
   * If provided, these will be used instead of auto-generated breadcrumbs
   */
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumbs Component
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const location = useLocation();

  // Use provided items or auto-generate from pathname
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  // Don't render if only one breadcrumb (Dashboard home)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <React.Fragment key={index}>
              {/* Separator */}
              {index > 0 && (
                <li>
                  <ChevronRight
                    className="w-4 h-4 text-deep-navy-400 dark:text-deep-navy-500"
                    aria-hidden="true"
                  />
                </li>
              )}

              {/* Breadcrumb Item */}
              <li className="flex items-center">
                {crumb.href && !isLast ? (
                  // Clickable link
                  <NavLink
                    to={crumb.href}
                    className="flex items-center gap-1.5 text-deep-navy-600 dark:text-deep-navy-300 hover:text-rephlo-blue dark:hover:text-electric-cyan transition-colors"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{crumb.label}</span>
                  </NavLink>
                ) : (
                  // Current page (not clickable)
                  <div className="flex items-center gap-1.5 font-semibold text-deep-navy-800 dark:text-white">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{crumb.label}</span>
                  </div>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
