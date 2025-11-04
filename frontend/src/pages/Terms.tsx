import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowLeft } from 'lucide-react';

function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <h1 className="text-h1 font-bold text-deep-navy-800 mb-4">Terms of Service</h1>
        <p className="text-body-sm text-deep-navy-400 mb-8">Last updated: November 2025</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Acceptance of Terms</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              By accessing and using Rephlo, you accept and agree to be bound by these Terms of Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">License</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              Rephlo grants you a limited, non-exclusive, non-transferable license to use the software
              for personal or commercial purposes, subject to these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Limitations</h2>
            <p className="text-body text-deep-navy-600 mb-4">
              You may not:
            </p>
            <ul className="list-disc pl-6 text-body text-deep-navy-600 space-y-2">
              <li>Reverse engineer or decompile the software</li>
              <li>Use the software for illegal purposes</li>
              <li>Redistribute or resell the software without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-h2 font-semibold text-deep-navy-800 mb-4">Contact</h2>
            <p className="text-body text-deep-navy-600">
              For questions about these terms, contact us at{' '}
              <a href="mailto:legal@rephlo.io" className="text-rephlo-blue hover:underline">
                legal@rephlo.io
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Terms;
