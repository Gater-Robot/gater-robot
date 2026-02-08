import clsx from 'clsx'
import React from 'react'

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'danger' }) {
  const { className, variant='primary', ...rest } = props
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-white text-black hover:bg-zinc-200',
        variant === 'ghost' && 'bg-white/10 text-white hover:bg-white/15 border border-white/10',
        variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
        className
      )}
    />
  )
}

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div {...rest} className={clsx('rounded-2xl border border-white/10 bg-white/5 p-5', className)} />
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={clsx(
        'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none',
        'focus:border-white/25',
        className
      )}
    />
  )
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { className, ...rest } = props
  return (
    <label {...rest} className={clsx('text-sm text-white/80', className)} />
  )
}

export function Pill(props: React.HTMLAttributes<HTMLSpanElement>) {
  const { className, ...rest } = props
  return (
    <span {...rest} className={clsx('inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/80', className)} />
  )
}

export function Hr() {
  return <div className="my-5 h-px w-full bg-white/10" />
}
