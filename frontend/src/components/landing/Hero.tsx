import Button from '@/components/common/Button';
import { ArrowRight, Download } from 'lucide-react';

function Hero() {
  const handleDownload = () => {
    window.location.hash = 'download';
  };

  return (
    <section className="relative overflow-hidden bg-gradient-vibrant py-4xl sm:py-[128px] shadow-2xl">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl">
        <div className="max-w-3xl mx-auto text-center">
          {/* Tagline - Animated entrance */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-xl animate-fade-in-down">
            Text that flows.
          </h1>

          {/* Subheading - Delayed animation */}
          <p className="text-xl sm:text-2xl text-white/90 mb-2xl animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
            AI-powered writing enhancement—system-wide, across every Windows application
          </p>

          {/* Body Copy - Delayed animation */}
          <p className="text-body-lg text-white/80 mb-3xl max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
            Rephlo brings intelligent text transformation directly into your workflow. Select text,
            choose a command, and watch your content refine instantly—in Outlook, Slack, VS Code,
            browsers, and every app you use daily.
          </p>

          {/* CTAs - Staggered animation */}
          <div className="flex flex-col sm:flex-row gap-lg justify-center items-center animate-scale-in" style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}>
            <Button
              size="lg"
              className="bg-white text-rephlo-blue hover:bg-white/90 font-semibold w-full sm:w-auto shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-base ease-out"
              onClick={handleDownload}
            >
              <Download className="mr-sm h-5 w-5" />
              Download for Windows
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-2 border-white text-white hover:bg-white hover:text-rephlo-blue w-full sm:w-auto shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-base ease-out"
              onClick={() => window.location.hash = 'demo'}
            >
              Watch 2-Minute Demo
              <ArrowRight className="ml-sm h-5 w-5" />
            </Button>
          </div>

          {/* Supporting Text - Final animation */}
          <p className="text-body-sm text-white/70 mt-2xl animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'backwards' }}>
            Free download · Windows 10/11 · Works with ChatGPT, Claude, and local AI models
          </p>
        </div>
      </div>

      {/* Decorative Elements with stronger glow */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-96 h-96 bg-electric-cyan rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-white/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }}></div>
      </div>
    </section>
  );
}

export default Hero;
