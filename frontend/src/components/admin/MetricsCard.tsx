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
  blue: 'bg-rephlo-blue/10 text-rephlo-blue',
  cyan: 'bg-electric-cyan/10 text-electric-cyan-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
};

function MetricsCard({ title, value, subtitle, icon: Icon, color = 'blue', children }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-body-sm font-medium text-deep-navy-700">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-h2 font-bold text-deep-navy-800">{value}</div>
        {subtitle && (
          <p className="text-caption text-deep-navy-400 mt-1">{subtitle}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

export default MetricsCard;
