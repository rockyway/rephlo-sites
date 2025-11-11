import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-xs bg-deep-navy-100 dark:bg-deep-navy-800 rounded-md p-xs shadow-sm">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'p-sm rounded-sm transition-all duration-base',
            theme === value
              ? 'bg-white dark:bg-deep-navy-700 text-rephlo-blue dark:text-electric-cyan shadow-sm'
              : 'text-deep-navy-700 dark:text-deep-navy-400 hover:text-deep-navy-700 dark:hover:text-deep-navy-200'
          )}
          aria-label={`${label} theme`}
          title={`${label} theme`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
