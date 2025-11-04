import { Link } from 'react-router-dom';
import Button from '@/components/common/Button';

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-deep-navy-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-rephlo-blue to-electric-cyan flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-h4 font-bold text-deep-navy-800">Rephlo</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-body text-deep-navy-500 hover:text-rephlo-blue transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-body text-deep-navy-500 hover:text-rephlo-blue transition-colors">
              Pricing
            </a>
            <a href="#docs" className="text-body text-deep-navy-500 hover:text-rephlo-blue transition-colors">
              Docs
            </a>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              Admin Dashboard
            </Button>
          </Link>
          <a href="#download">
            <Button size="sm">
              Download
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
