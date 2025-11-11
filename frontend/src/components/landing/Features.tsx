import { Globe, Zap, Lock, Sparkles, Clock, Layers, Cpu, Rocket, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import FeatureBadge from '@/components/common/FeatureBadge';
import ExpandableContent from '@/components/common/ExpandableContent';
import useScrollAnimation from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Globe,
    title: 'Works in every Windows app',
    badges: [
      { icon: Globe, label: 'System-wide' },
      { icon: Layers, label: 'Any App' },
    ],
    highlights: ['Outlook', 'Slack', 'VS Code', 'Notion', 'Browsers'],
    keyPoint: 'Direct Windows integration',
    fullDescription:
      'Unlike browser extensions or chat interfaces, Rephlo integrates directly into Windows. Transform text in Outlook, Slack, VS Code, Notion, browsers, and any application—no copy-paste required.',
  },
  {
    icon: Zap,
    title: 'Your AI, your way',
    badges: [
      { icon: Sparkles, label: 'Unlimited' },
      { icon: Cpu, label: 'Customizable' },
    ],
    highlights: ['"Make Professional"', '"Simplify Docs"', 'Your Commands'],
    keyPoint: 'Powerful template system',
    fullDescription:
      'Create unlimited custom commands tailored to your workflows. From "Write Professional Email" to "Simplify Technical Docs," Rephlo adapts to your specific writing needs with powerful template system.',
  },
  {
    icon: Sparkles,
    title: 'Select. Command. Done.',
    badges: [
      { icon: Zap, label: 'Instant' },
      { icon: Rocket, label: 'Zero Latency' },
    ],
    highlights: ['Context menu', 'Transform in seconds', 'No waiting'],
    keyPoint: 'Speed of thought',
    fullDescription:
      'No context switching. No waiting. Select text, choose a command from the context menu, and your content transforms in seconds. Writing enhancement at the speed of thought.',
  },
  {
    icon: Lock,
    title: 'Your data, your choice',
    badges: [
      { icon: Shield, label: 'Private' },
      { icon: Lock, label: 'Flexible' },
    ],
    highlights: ['Azure OpenAI', 'Groq', 'Ollama (local)'],
    keyPoint: 'You control where AI runs',
    fullDescription:
      'Choose from cloud providers (Azure OpenAI, Groq) or run completely local with Ollama. Your text stays private, and you control where AI processing happens—essential for sensitive work.',
  },
  {
    icon: Clock,
    title: 'Background intelligence',
    badges: [
      { icon: Cpu, label: 'Lightweight' },
      { icon: Clock, label: 'Always Ready' },
    ],
    highlights: ['<100MB RAM', 'Zero performance impact', 'System tray'],
    keyPoint: 'One shortcut away',
    fullDescription:
      'Rephlo runs quietly in your system tray, ready when you need it. Minimal memory footprint (<100MB), zero performance impact, and always one keyboard shortcut away.',
  },
  {
    icon: Layers,
    title: 'Feels native, works everywhere',
    badges: [
      { icon: Layers, label: 'Native UX' },
      { icon: Sparkles, label: 'No Learning Curve' },
    ],
    highlights: ['Windows UI patterns', 'Keyboard shortcuts', 'Select & use'],
    keyPoint: 'Instantly familiar',
    fullDescription:
      "No learning curve. Rephlo uses Windows' native UI patterns and keyboard shortcuts. If you can select text, you can use Rephlo—it's that simple.",
  },
];

function FeatureCard({ feature, delay }: { feature: typeof features[0]; delay: number }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-[600ms] ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Card
        variant="interactive"
        className="shadow-md hover:shadow-xl transition-all duration-base h-full"
      >
        <CardHeader>
          <div className="mb-lg inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-rephlo shadow-lg transition-all duration-base ease-out group-hover:shadow-xl group-hover:scale-105">
            <Icon className="h-8 w-8 text-white transition-transform duration-base ease-out group-hover:scale-110 group-hover:rotate-6" />
          </div>

          <CardTitle className="text-h4 mb-md">{feature.title}</CardTitle>

          {/* Visual Badges */}
          <div className="flex flex-wrap gap-sm mb-lg">
            {feature.badges.map((badge, idx) => (
              <FeatureBadge
                key={idx}
                icon={badge.icon}
                label={badge.label}
              />
            ))}
          </div>

          {/* Key Highlights - Bullet Points */}
          <ul className="space-y-xs mb-md">
            {feature.highlights.map((highlight, idx) => (
              <li
                key={idx}
                className="flex items-start text-body-sm text-deep-navy-600 dark:text-deep-navy-300"
              >
                <span className="mr-sm text-rephlo-blue dark:text-electric-cyan mt-[2px] flex-shrink-0">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          {/* Key Point - Call to Action */}
          <div className="pt-sm border-t border-deep-navy-200 dark:border-deep-navy-700 mb-sm">
            <p className="text-caption font-medium text-electric-cyan-600 dark:text-electric-cyan-400">
              {feature.keyPoint}
            </p>
          </div>

          {/* Expandable Full Description */}
          <ExpandableContent>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 leading-relaxed">
              {feature.fullDescription}
            </p>
          </ExpandableContent>
        </CardHeader>
      </Card>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-4xl bg-white dark:bg-deep-navy-900 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rephlo-blue rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-electric-cyan rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-4xl">
          <h2 className="text-h1 font-bold text-deep-navy-800 dark:text-white mb-lg">
            Write anywhere. Enhance everywhere.
          </h2>
          <p className="text-body-lg text-deep-navy-700 dark:text-deep-navy-300">
            System-wide AI writing assistance that adapts to your workflow
          </p>
        </div>

        {/* Features Grid with Staggered Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2xl">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
