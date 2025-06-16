import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-orange-500 text-white shadow hover:bg-orange-600',
        secondary:
          'border-transparent bg-orange-100 text-orange-900 hover:bg-orange-200',
        destructive:
          'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'text-orange-700 shadow-sm',
        tools: 'border-transparent bg-blue-100 text-blue-900 hover:bg-blue-200',
        skills:
          'border-transparent bg-purple-100 text-purple-900 hover:bg-purple-200',
        food: 'border-transparent bg-green-100 text-green-900 hover:bg-green-200',
        supplies:
          'border-transparent bg-amber-100 text-amber-900 hover:bg-amber-200',
        other: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
