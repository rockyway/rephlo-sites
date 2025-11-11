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
    <section className="py-4xl bg-white dark:bg-deep-navy-900">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-4xl">
          <h2 className="text-h1 font-bold text-deep-navy-800 dark:text-white mb-lg">
            Trusted by professionals worldwide
          </h2>
          <p className="text-body-lg text-deep-navy-700 dark:text-deep-navy-300">
            From thought to polished—instantly.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl">
          {testimonials.map((testimonial, index) => (
            <Card key={index} variant="featured" className="relative shadow-lg hover:shadow-2xl transition-all duration-base">
              <CardContent className="pt-xl">
                <Quote className="h-12 w-12 text-rephlo-blue/40 dark:text-electric-cyan/60 mb-lg transition-all duration-base ease-out group-hover:text-rephlo-blue/60 dark:group-hover:text-electric-cyan/80 group-hover:scale-110" />
                <blockquote className="text-body text-deep-navy-700 dark:text-deep-navy-200 mb-xl">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-md">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-rephlo flex items-center justify-center text-white font-semibold text-body shadow-md">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-body-sm font-semibold text-deep-navy-800 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-caption text-deep-navy-700 dark:text-deep-navy-400">
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
