import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Button from '@/components/common/Button';
import ThemeToggle from '@/components/common/ThemeToggle';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

function NavLink({ href, children, isActive }: NavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Base styles
        'px-md py-sm rounded-sm text-body',
        // Enhanced transitions
        'transition-all duration-base ease-out',
        // Active state with indicator
        isActive
          ? 'text-rephlo-blue dark:text-electric-cyan border-b-2 border-b-rephlo-blue dark:border-b-electric-cyan shadow-sm'
          : 'text-deep-navy-700 dark:text-deep-navy-300',
        // Hover state
        'hover:text-rephlo-blue dark:hover:text-electric-cyan hover:shadow-sm'
      )}
    >
      {children}
    </a>
  );
}

function Header() {
  const location = useLocation();

  // Determine active nav based on hash or pathname
  const isActive = (path: string) => {
    if (path.startsWith('#')) {
      return window.location.hash === path;
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-deep-navy-200 dark:border-deep-navy-700 bg-white/95 dark:bg-deep-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-deep-navy-900/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-lg sm:px-xl lg:px-2xl">
        {/* Logo with subtle gradient effect */}
        <div className="flex items-center gap-xl">
          <Link to="/" className="flex items-center space-x-sm">
            <div className="h-8 w-8 rounded-md bg-gradient-rephlo flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-base">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-h4 font-bold text-deep-navy-800 dark:text-white">Rephlo</span>
          </Link>

          {/* Navigation Links with active indicators */}
          <nav className="hidden md:flex items-center gap-lg">
            <NavLink href="#features" isActive={isActive('#features')}>
              Features
            </NavLink>
            <NavLink href="#pricing" isActive={isActive('#pricing')}>
              Pricing
            </NavLink>
            <NavLink href="#docs" isActive={isActive('#docs')}>
              Docs
            </NavLink>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-sm">
          <ThemeToggle />
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              Admin Dashboard
            </Button>
          </Link>
          <a href="#download">
            <Button size="sm" className="bg-rephlo-blue text-white hover:bg-rephlo-blue-600 shadow-md hover:shadow-lg">
              Download
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
