import Button from '@/components/common/Button';
import { Download, Play, Book } from 'lucide-react';

function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-rephlo-blue to-electric-cyan">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-h1 font-bold text-white mb-4">
            Ready to transform your writing?
          </h2>
          <p className="text-body-lg text-white/90 mb-12">
            Download Rephlo for Windows today and experience AI-powered writing enhancement
            everywhere you work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-white hover:bg-white/90 text-rephlo-blue font-semibold w-full sm:w-auto"
              onClick={() => window.location.hash = 'download'}
            >
              <Download className="mr-2 h-5 w-5" />
              Download
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={() => window.location.hash = 'demo'}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 w-full sm:w-auto"
              onClick={() => window.location.hash = 'docs'}
            >
              <Book className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>

          <p className="text-body-sm text-white/70 mt-8">
            Free to download. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}

export default CTA;
