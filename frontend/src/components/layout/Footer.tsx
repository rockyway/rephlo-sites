import { Link } from 'react-router-dom';
import { Github, Linkedin, Twitter } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-deep-navy-200 bg-white shadow-sm">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2xl">
          {/* Logo & Tagline */}
          <div className="space-y-lg">
            <div className="flex items-center space-x-sm">
              <div className="h-8 w-8 rounded-md bg-gradient-rephlo flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-base">
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
            <h3 className="text-body font-semibold text-deep-navy-800 mb-lg">Product</h3>
            <ul className="space-y-sm">
              <li>
                <a href="#features" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#download" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Download
                </a>
              </li>
              <li>
                <a href="#docs" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-body font-semibold text-deep-navy-800 mb-lg">Company</h3>
            <ul className="space-y-sm">
              <li>
                <a href="#about" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  About
                </a>
              </li>
              <li>
                <a href="#blog" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Blog
                </a>
              </li>
              <li>
                <a href="mailto:hello@rephlo.io" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-body font-semibold text-deep-navy-800 mb-lg">Legal</h3>
            <ul className="space-y-sm">
              <li>
                <Link to="/privacy" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-body-sm text-deep-navy-500 hover:text-rephlo-blue transition-colors duration-base ease-out">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-3xl pt-2xl border-t border-deep-navy-200 flex flex-col sm:flex-row justify-between items-center gap-lg">
          <p className="text-caption text-deep-navy-400">
            © {currentYear} Rephlo. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-lg">
            <a
              href="https://twitter.com/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-all duration-base ease-out hover:scale-110"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com/company/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-all duration-base ease-out hover:scale-110"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/rephlo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-navy-400 hover:text-rephlo-blue transition-all duration-base ease-out hover:scale-110"
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
