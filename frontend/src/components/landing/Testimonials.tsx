import { Card, CardContent } from '@/components/common/Card';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      'Rephlo saves me 2-3 hours every week on email writing alone. The fact that it works directly in Outlook is a game-changer.',
    author: 'Sarah Chen',
    role: 'Product Manager at TechCorp',
    avatar: 'SC',
  },
  {
    quote:
      'As a non-native English speaker, Rephlo gives me confidence in my writing. It\'s like having an editor available 24/7, everywhere I type.',
    author: 'Marco Rossi',
    role: 'Software Engineer',
    avatar: 'MR',
  },
  {
    quote:
      'I was skeptical about another AI tool, but Rephlo\'s local Ollama support won me over. My code comments and documentation stay private while getting AI enhancement.',
    author: 'Alex Johnson',
    role: 'Senior Developer',
    avatar: 'AJ',
  },
];

function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-h1 font-bold text-deep-navy-800 mb-4">
            Trusted by professionals worldwide
          </h2>
          <p className="text-body-lg text-deep-navy-500">
            From thought to polished—instantly.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-rephlo-blue/20 mb-4" />
                <blockquote className="text-body text-deep-navy-700 mb-6">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-rephlo-blue to-electric-cyan flex items-center justify-center text-white font-semibold text-body-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-body-sm font-semibold text-deep-navy-800">
                      {testimonial.author}
                    </div>
                    <div className="text-caption text-deep-navy-500">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
