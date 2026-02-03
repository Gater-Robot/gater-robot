/**
 * Notification System
 *
 * Wrapper around react-hot-toast for consistent notifications.
 */

import toast, { type ToastPosition } from 'react-hot-toast'
import { createElement } from 'react'

type NotificationStatus = 'success' | 'info' | 'loading' | 'error' | 'warning'

interface NotificationOptions {
  duration?: number
  position?: ToastPosition
  icon?: string
}

const DEFAULT_DURATION = 4000
const DEFAULT_POSITION: ToastPosition = 'top-center'

/**
 * Status icons as emoji (simple, no extra dependencies)
 */
const STATUS_ICONS: Record<NotificationStatus, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
  error: '✕',
  loading: '⏳',
}

/**
 * Create notification with custom styling
 */
function createNotification(
  content: React.ReactNode,
  status: NotificationStatus,
  options: NotificationOptions = {}
): string {
  const { duration = DEFAULT_DURATION, position = DEFAULT_POSITION, icon } = options

  return toast.custom(
    (t) =>
      createElement(
        'div',
        {
          className: `flex items-center gap-3 max-w-sm rounded-lg shadow-lg px-4 py-3 transition-all duration-300 ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          } ${getStatusStyles(status)}`,
          onClick: () => toast.dismiss(t.id),
        },
        createElement(
          'span',
          { className: 'text-lg flex-shrink-0' },
          icon ?? STATUS_ICONS[status]
        ),
        createElement('div', { className: 'flex-1 text-sm' }, content),
        createElement(
          'button',
          {
            className: 'text-lg opacity-60 hover:opacity-100 transition-opacity',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              toast.dismiss(t.id)
            },
          },
          '×'
        )
      ),
    {
      duration: status === 'loading' ? Infinity : duration,
      position,
    }
  )
}

/**
 * Get CSS classes for notification status
 */
function getStatusStyles(status: NotificationStatus): string {
  switch (status) {
    case 'success':
      return 'bg-green-900/90 text-green-100 border border-green-700/50'
    case 'error':
      return 'bg-red-900/90 text-red-100 border border-red-700/50'
    case 'warning':
      return 'bg-yellow-900/90 text-yellow-100 border border-yellow-700/50'
    case 'info':
      return 'bg-blue-900/90 text-blue-100 border border-blue-700/50'
    case 'loading':
      return 'bg-slate-800/90 text-slate-100 border border-slate-600/50'
    default:
      return 'bg-slate-800/90 text-slate-100 border border-slate-600/50'
  }
}

/**
 * Notification API
 */
export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) =>
    createNotification(content, 'success', options),

  error: (content: React.ReactNode, options?: NotificationOptions) =>
    createNotification(content, 'error', options),

  warning: (content: React.ReactNode, options?: NotificationOptions) =>
    createNotification(content, 'warning', options),

  info: (content: React.ReactNode, options?: NotificationOptions) =>
    createNotification(content, 'info', options),

  loading: (content: React.ReactNode, options?: NotificationOptions) =>
    createNotification(content, 'loading', options),

  remove: (toastId: string) => toast.remove(toastId),

  dismiss: (toastId?: string) => toast.dismiss(toastId),
}
