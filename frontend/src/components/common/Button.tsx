import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    // Base layout and typography
    'inline-flex items-center justify-center rounded-md text-body font-medium',
    // Enhanced transitions with design tokens
    'transition-all duration-base ease-out',
    // Shadow elevation with micro-interactions
    'shadow-sm hover:shadow-md active:shadow-sm',
    // Scale feedback on active state
    'active:scale-95',
    // Focus states
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue focus-visible:ring-offset-2',
    // Disabled state
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-rephlo-blue text-white hover:bg-rephlo-blue-600 active:bg-rephlo-blue-700',
        secondary:
          'border-2 border-rephlo-blue bg-transparent text-rephlo-blue hover:bg-rephlo-blue/10 active:bg-rephlo-blue/20',
        ghost:
          'bg-transparent text-deep-navy-700 hover:bg-deep-navy-100 active:bg-deep-navy-200',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
      },
      size: {
        default: 'h-10 px-lg py-sm',
        sm: 'h-9 px-md text-body-sm',
        lg: 'h-12 px-xl py-md text-body-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
