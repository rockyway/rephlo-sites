import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowLeft } from 'lucide-react';

function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <h1 className="text-h1 font-bold text-deep-navy-800 mb-4">Privacy Policy</h1>
        <p className="text-body-sm text-deep-navy-400 mb-8">Last updated: November 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Overview</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              Rephlo is committed to protecting your privacy. This Privacy Policy explains how we collect,
              use, and safeguard your information when you use our application and website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Information We Collect</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              We collect minimal information necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 text-body text-deep-navy-600 space-y-2">
              <li>Download statistics (operating system, timestamp)</li>
              <li>Feedback submissions (message, optional email)</li>
              <li>Diagnostic reports (technical data, optional)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Data Privacy</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              <strong>Important:</strong> Rephlo does not log, store, or transmit your text content.
              When using local AI (Ollama), all processing happens entirely on your machine.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Contact</h2>
            <p className="text-body text-deep-navy-600">
              For privacy questions, contact us at{' '}
              <a href="mailto:privacy@rephlo.io" className="text-rephlo-blue hover:underline">
                privacy@rephlo.io
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Privacy;
