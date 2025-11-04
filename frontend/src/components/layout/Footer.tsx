import { Link } from 'react-router-dom';
import { Github, Linkedin, Twitter } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-deep-navy-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Tagline */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-rephlo-blue to-electric-cyan flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-h4 font-bold text-deep-navy-800">Rephlo</span>
            </div>
            <p className="text-body-sm text-deep-navy-500">
              Text that flows.
            </p>
            <p className="text-caption text-deep-navy-400">
              AI-powered writing enhancement for Windows.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-body font-semibold text-deep-navy-800 mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#download" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Download
                </a>
              </li>
              <li>
                <a href="#docs" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-body font-semibold text-deep-navy-800 mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#blog" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="mailto:hello@rephlo.io" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-body font-semibold text-deep-navy-800 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-deep-navy-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-caption text-deep-navy-400">
            © {currentYear} Rephlo. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com/company/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
