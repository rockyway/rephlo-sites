import { Users, Code, PenTool, Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card';

const audiences = [
  {
    icon: Users,
    title: 'Knowledge Workers',
    headline: 'Stop switching tabs. Stop copy-pasting. Write smarter.',
    description:
      'Rephlo brings AI writing assistance directly into Outlook, Teams, and every app you use—transforming drafts into polished messages without leaving your workspace. Refine emails, summarize documents, adjust tone—all with a simple text selection and command.',
  },
  {
    icon: Code,
    title: 'Developers',
    headline: 'Document code. Clarify commits. Refine comments. Right from your IDE.',
    description:
      'Rephlo integrates with VS Code, Visual Studio, and any editor you use. Generate documentation, improve commit messages, translate code comments—with full support for local Ollama models to keep your code private and secure.',
  },
  {
    icon: PenTool,
    title: 'Content Creators',
    headline: 'Create faster. Polish smarter. Publish confident.',
    description:
      'Rewrite social posts, summarize research, adapt tone across platforms—all from your favorite tools. Rephlo gives you custom AI commands tailored to your content workflows, from blog drafts to Twitter threads.',
  },
  {
    icon: Globe,
    title: 'Non-Native English Speakers',
    headline: 'Write with confidence in professional English.',
    description:
      'Rephlo refines grammar, adjusts tone, and polishes your English—in real-time, wherever you\'re composing messages or documents. Build custom commands for your specific writing challenges and improve with every use.',
  },
];

function TargetAudience() {
  return (
    <section className="py-4xl bg-deep-navy-50 dark:bg-deep-navy-950">
      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-4xl">
          <h2 className="text-h1 font-bold text-deep-navy-800 dark:text-white mb-lg">
            Built for how you work
          </h2>
          <p className="text-body-lg text-deep-navy-500 dark:text-deep-navy-300">
            Whether you're writing code, emails, or content, Rephlo adapts to your workflow.
          </p>
        </div>

        {/* Audience Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
          {audiences.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <Card key={index} variant="interactive" className="shadow-md hover:shadow-xl transition-all duration-base">
                <CardHeader>
                  <div className="flex items-start gap-lg">
                    <div className="flex-shrink-0 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-electric-cyan-500 to-electric-cyan-600 shadow-lg transition-all duration-base ease-out group-hover:shadow-xl group-hover:scale-105">
                      <Icon className="h-8 w-8 text-white transition-transform duration-base ease-out group-hover:scale-110" />
                    </div>
                    <div className="flex-1">
                      <div className="text-caption font-semibold text-electric-cyan-600 uppercase tracking-wide mb-sm">
                        {audience.title}
                      </div>
                      <CardTitle className="text-h3 mb-md">{audience.headline}</CardTitle>
                      <CardDescription className="text-body">
                        {audience.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TargetAudience;
