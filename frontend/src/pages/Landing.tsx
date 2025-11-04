import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import TargetAudience from '@/components/landing/TargetAudience';
import Testimonials from '@/components/landing/Testimonials';
import CTA from '@/components/landing/CTA';

function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-deep-navy-900">
      <Header />
      <main>
        <Hero />
        <Features />
        <TargetAudience />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
