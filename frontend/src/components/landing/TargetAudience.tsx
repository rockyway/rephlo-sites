import { Users, Code, PenTool, Globe, Mail, MessageSquare, FileText, Github, Terminal, Twitter, FileEdit, Pencil, Languages, CheckCircle, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import AppIconGrid from '@/components/common/AppIconGrid';
import WorkflowVisual from '@/components/common/WorkflowVisual';
import ExpandableContent from '@/components/common/ExpandableContent';
import useScrollAnimation from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const audiences = [
  {
    icon: Users,
    title: 'Knowledge Workers',
    headline: 'Stop switching tabs. Stop copy-pasting. Write smarter.',
    apps: [
      { icon: Mail, label: 'Outlook', color: 'text-blue-600' },
      { icon: MessageSquare, label: 'Teams', color: 'text-purple-600' },
      { icon: MessageSquare, label: 'Slack', color: 'text-pink-600' },
    ],
    useCases: ['Polish emails', 'Summarize docs', 'Adjust tone'],
    stat: '2-3 hrs saved/week',
    workflow: [
      { label: 'Draft' },
      { icon: Zap, label: 'Refine' },
      { icon: CheckCircle, label: 'Send' },
    ],
    fullDescription:
      'Rephlo brings AI writing assistance directly into Outlook, Teams, and every app you use—transforming drafts into polished messages without leaving your workspace. Refine emails, summarize documents, adjust tone—all with a simple text selection and command.',
  },
  {
    icon: Code,
    title: 'Developers',
    headline: 'Document code. Clarify commits. Refine comments.',
    apps: [
      { icon: Code, label: 'VS Code', color: 'text-blue-500' },
      { icon: Github, label: 'GitHub', color: 'text-gray-800 dark:text-gray-200' },
      { icon: Terminal, label: 'Terminal', color: 'text-green-600' },
    ],
    useCases: ['Generate docs', 'Polish commits', '🔒 100% Local (Ollama)'],
    stat: 'Private & Secure',
    workflow: [
      { label: 'Code' },
      { icon: Zap, label: 'Enhance' },
      { icon: CheckCircle, label: 'Commit' },
    ],
    fullDescription:
      'Rephlo integrates with VS Code, Visual Studio, and any editor you use. Generate documentation, improve commit messages, translate code comments—with full support for local Ollama models to keep your code private and secure.',
  },
  {
    icon: PenTool,
    title: 'Content Creators',
    headline: 'Create faster. Polish smarter. Publish confident.',
    apps: [
      { icon: Twitter, label: 'Twitter', color: 'text-sky-500' },
      { icon: FileEdit, label: 'Medium', color: 'text-gray-700 dark:text-gray-300' },
      { icon: FileText, label: 'Notion', color: 'text-gray-800 dark:text-gray-200' },
    ],
    useCases: ['Rewrite posts', 'Adapt tone', 'Custom commands'],
    stat: 'Draft to publish, faster',
    workflow: [
      { label: 'Idea' },
      { icon: Zap, label: 'Polish' },
      { icon: CheckCircle, label: 'Publish' },
    ],
    fullDescription:
      'Rewrite social posts, summarize research, adapt tone across platforms—all from your favorite tools. Rephlo gives you custom AI commands tailored to your content workflows, from blog drafts to Twitter threads.',
  },
  {
    icon: Globe,
    title: 'Non-Native English Speakers',
    headline: 'Write with confidence in professional English.',
    apps: [
      { icon: Languages, label: 'Grammar', color: 'text-green-600' },
      { icon: Pencil, label: 'Tone', color: 'text-purple-600' },
      { icon: FileText, label: 'Polish', color: 'text-blue-600' },
    ],
    useCases: ['Professional English', 'Real-time refinement', 'Custom challenges'],
    stat: '24/7 Editor, everywhere',
    workflow: [
      { label: 'Type' },
      { icon: Zap, label: 'Refine' },
      { icon: CheckCircle, label: 'Confident' },
    ],
    fullDescription:
      "Rephlo refines grammar, adjusts tone, and polishes your English—in real-time, wherever you're composing messages or documents. Build custom commands for your specific writing challenges and improve with every use.",
  },
];

function AudienceCard({ audience, delay }: { audience: typeof audiences[0]; delay: number }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    triggerOnce: true,
  });

  const Icon = audience.icon;

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
      <Card variant="interactive" className="shadow-md hover:shadow-xl transition-all duration-base h-full">
        <CardHeader>
          <div className="flex items-start gap-lg mb-lg">
            <div className="flex-shrink-0 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-electric-cyan-500 to-electric-cyan-600 shadow-lg transition-all duration-base ease-out group-hover:shadow-xl group-hover:scale-105">
              <Icon className="h-8 w-8 text-white transition-transform duration-base ease-out group-hover:scale-110" />
            </div>
            <div className="flex-1">
              <div className="text-caption font-semibold text-electric-cyan-600 dark:text-electric-cyan-400 uppercase tracking-wide mb-xs">
                {audience.title}
              </div>
              <CardTitle className="text-h4 leading-tight">{audience.headline}</CardTitle>
            </div>
          </div>

          {/* App Icons */}
          <div className="mb-lg">
            <div className="text-caption font-medium text-deep-navy-700 dark:text-deep-navy-400 mb-sm">
              Works with:
            </div>
            <AppIconGrid apps={audience.apps} />
          </div>

          {/* Use Cases - Bullet Points */}
          <div className="mb-lg">
            <ul className="space-y-xs">
              {audience.useCases.map((useCase, idx) => (
                <li
                  key={idx}
                  className="flex items-start text-body-sm text-deep-navy-600 dark:text-deep-navy-300"
                >
                  <span className="mr-sm text-electric-cyan-500 dark:text-electric-cyan-400 mt-[2px] flex-shrink-0">•</span>
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stat Highlight */}
          <div className="mb-lg p-md bg-electric-cyan-50 dark:bg-electric-cyan-900/10 rounded-md border border-electric-cyan-200 dark:border-electric-cyan-800/30">
            <p className="text-body-sm font-semibold text-electric-cyan-700 dark:text-electric-cyan-400">
              {audience.stat}
            </p>
          </div>

          {/* Workflow Visualization */}
          <div className="pt-sm border-t border-deep-navy-200 dark:border-deep-navy-700 mb-sm">
            <div className="text-caption font-medium text-deep-navy-700 dark:text-deep-navy-400 mb-sm">
              Workflow:
            </div>
            <WorkflowVisual steps={audience.workflow} />
          </div>

          {/* Expandable Full Description */}
          <ExpandableContent>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 leading-relaxed">
              {audience.fullDescription}
            </p>
          </ExpandableContent>
        </CardHeader>
      </Card>
    </div>
  );
}

function TargetAudience() {
  return (
    <section className="py-4xl bg-deep-navy-50 dark:bg-deep-navy-950 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-electric-cyan rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-rephlo-blue rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-lg sm:px-xl lg:px-2xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-4xl">
          <h2 className="text-h1 font-bold text-deep-navy-800 dark:text-white mb-lg">
            Built for how you work
          </h2>
          <p className="text-body-lg text-deep-navy-700 dark:text-deep-navy-300">
            Tailored experiences for every workflow and writing style
          </p>
        </div>

        {/* Audience Cards with Staggered Animation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
          {audiences.map((audience, index) => (
            <AudienceCard
              key={index}
              audience={audience}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TargetAudience;
