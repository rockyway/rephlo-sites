import Button from '@/components/common/Button';
import { Download, Play, Book } from 'lucide-react';

function CTA() {
  return (
    <section className="py-4xl bg-gradient-vibrant shadow-2xl">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-h1 font-bold text-white mb-lg animate-fade-in">
            Ready to transform your writing?
          </h2>
          <p className="text-body-lg text-white/90 mb-3xl animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
            Download Rephlo for Windows today and experience AI-powered writing enhancement
            everywhere you work.
          </p>

          <div className="flex flex-col sm:flex-row gap-lg justify-center items-center animate-scale-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
            <Button
              size="lg"
              className="bg-white hover:bg-white/90 text-rephlo-blue font-semibold w-full sm:w-auto shadow-xl hover:shadow-2xl hover:scale-105 active:shadow-lg transition-all duration-base ease-out"
              onClick={() => window.location.hash = 'download'}
            >
              <Download className="mr-sm h-5 w-5" />
              Download
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-2 border-white text-white hover:bg-white hover:text-rephlo-blue w-full sm:w-auto shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-base ease-out"
              onClick={() => window.location.hash = 'demo'}
            >
              <Play className="mr-sm h-5 w-5" />
              Watch Demo
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/20 w-full sm:w-auto shadow-md hover:shadow-lg hover:scale-105 transition-all duration-base ease-out"
              onClick={() => window.location.hash = 'docs'}
            >
              <Book className="mr-sm h-5 w-5" />
              Learn More
            </Button>
          </div>

          <p className="text-body-sm text-white/70 mt-2xl">
            Free to download. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

export default CTA;
