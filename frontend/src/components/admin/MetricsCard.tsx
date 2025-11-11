import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'cyan' | 'green' | 'amber';
  children?: ReactNode;
}

const colorClasses = {
  blue: 'bg-blue-100 dark:bg-cyan-900/30 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/50',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
};

function MetricsCard({ title, value, subtitle, icon: Icon, color = 'blue', children }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-h2 font-bold text-deep-navy-800 dark:text-white">{value}</div>
        {subtitle && (
          <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300 mt-1">{subtitle}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

export default MetricsCard;
