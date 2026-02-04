/**
 * Note Component
 *
 * Alert/callout box for displaying contextual information.
 * Supports info, warning, success, error, and neutral variants.
 */

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type NoteVariant = 'info' | 'warning' | 'success' | 'error' | 'neutral'

const variantStyles: Record<NoteVariant, string> = {
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-100',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-100',
  success: 'border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-100',
  neutral: 'border-border bg-muted/50 text-muted-foreground',
}

const variantIcons: Record<NoteVariant, ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />,
  success: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />,
  neutral: null,
}

interface NoteProps {
  /** Content to display */
  children: ReactNode
  /** Visual variant */
  variant?: NoteVariant
  /** Additional class names */
  className?: string
  /** Show icon */
  showIcon?: boolean
}

/**
 * Note component for contextual alerts
 */
export function Note({
  children,
  variant = 'neutral',
  className,
  showIcon = true,
}: NoteProps) {
  const icon = showIcon ? variantIcons[variant] : null

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm leading-relaxed',
        variantStyles[variant],
        className
      )}
    >
      {icon ? (
        <div className="flex gap-3">
          {icon}
          <div className="flex-1">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default Note
