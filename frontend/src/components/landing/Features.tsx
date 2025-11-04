import { Globe, Zap, Lock, Sparkles, Clock, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card';

const features = [
  {
    icon: Globe,
    title: 'Works in every Windows app',
    description:
      'Unlike browser extensions or chat interfaces, Rephlo integrates directly into Windows. Transform text in Outlook, Slack, VS Code, Notion, browsers, and any application—no copy-paste required.',
  },
  {
    icon: Zap,
    title: 'Your AI, your way',
    description:
      'Create unlimited custom commands tailored to your workflows. From "Write Professional Email" to "Simplify Technical Docs," Rephlo adapts to your specific writing needs with powerful template system.',
  },
  {
    icon: Sparkles,
    title: 'Select. Command. Done.',
    description:
      'No context switching. No waiting. Select text, choose a command from the context menu, and your content transforms in seconds. Writing enhancement at the speed of thought.',
  },
  {
    icon: Lock,
    title: 'Your data, your choice',
    description:
      'Choose from cloud providers (Azure OpenAI, Groq) or run completely local with Ollama. Your text stays private, and you control where AI processing happens—essential for sensitive work.',
  },
  {
    icon: Clock,
    title: 'Background intelligence',
    description:
      'Rephlo runs quietly in your system tray, ready when you need it. Minimal memory footprint (<100MB), zero performance impact, and always one keyboard shortcut away.',
  },
  {
    icon: Layers,
    title: 'Feels native, works everywhere',
    description:
      'No learning curve. Rephlo uses Windows\' native UI patterns and keyboard shortcuts. If you can select text, you can use Rephlo—it\'s that simple.',
  },
];

function Features() {
  return (
    <section id="features" className="py-4xl bg-white">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-4xl">
          <h2 className="text-h1 font-bold text-deep-navy-800 mb-lg">
            Write anywhere. Enhance everywhere.
          </h2>
          <p className="text-body-lg text-deep-navy-500">
            The only AI writing assistant that works system-wide across every Windows
            application—without disrupting your flow.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2xl">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                variant="interactive"
              >
                <CardHeader>
                  <div className="mb-lg inline-flex h-12 w-12 items-center justify-center rounded-lg bg-rephlo-blue/10 transition-all duration-base ease-out group-hover:bg-rephlo-blue/20">
                    <Icon className="h-6 w-6 text-rephlo-blue transition-transform duration-base ease-out group-hover:scale-110" />
                  </div>
                  <CardTitle className="text-h4">{feature.title}</CardTitle>
                  <CardDescription className="mt-sm text-body">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
