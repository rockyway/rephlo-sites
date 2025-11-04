import Button from '@/components/common/Button';
import { ArrowRight, Download } from 'lucide-react';

function Hero() {
  const handleDownload = () => {
    window.location.hash = 'download';
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-deep-navy-800 to-rephlo-blue py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Tagline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
            Text that flows.
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-white/90 mb-8">
            AI-powered writing enhancement—system-wide, across every Windows application
          </p>

          {/* Body Copy */}
          <p className="text-body-lg text-white/80 mb-12 max-w-2xl mx-auto">
            Rephlo brings intelligent text transformation directly into your workflow. Select text,
            choose a command, and watch your content refine instantly—in Outlook, Slack, VS Code,
            browsers, and every app you use daily.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-electric-cyan hover:bg-electric-cyan-600 text-deep-navy-800 font-semibold w-full sm:w-auto"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-5 w-5" />
              Download for Windows
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={() => window.location.hash = 'demo'}
            >
              Watch 2-Minute Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Supporting Text */}
          <p className="text-body-sm text-white/60 mt-8">
            Free download · Windows 10/11 · Works with ChatGPT, Claude, and local AI models
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-electric-cyan rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rephlo-blue-400 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
}

export default Hero;
