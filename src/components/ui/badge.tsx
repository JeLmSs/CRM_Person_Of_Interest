'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
        secondary:
          'border-transparent bg-zinc-800 text-zinc-300 border-zinc-700',
        destructive:
          'border-transparent bg-red-600/20 text-red-400 border-red-500/30',
        outline:
          'border-zinc-700 text-zinc-300',
        tier_s:
          'border-transparent bg-amber-400/10 text-amber-400 border-amber-400/30',
        tier_a:
          'border-transparent bg-violet-400/10 text-violet-400 border-violet-400/30',
        tier_b:
          'border-transparent bg-blue-400/10 text-blue-400 border-blue-400/30',
        tier_c:
          'border-transparent bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
        tier_d:
          'border-transparent bg-zinc-400/10 text-zinc-400 border-zinc-400/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
