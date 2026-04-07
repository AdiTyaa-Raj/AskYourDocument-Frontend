'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface InitialsAvatarProps {
  name: string
  title?: string
  className?: string
  textClassName?: string
  fallbackIcon?: React.ReactNode
  fixedColor?: boolean
}

const COLOR_CLASSES = [
  'bg-slate-600 text-white',
  'bg-slate-700 text-white',
  'bg-zinc-700 text-white',
  'bg-gray-700 text-white',
  'bg-neutral-700 text-white',
  'bg-slate-500 text-white',
]

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function getColorClass(name: string) {
  if (!name) return COLOR_CLASSES[0]
  let hash = 0
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0
    hash = code + ((hash << 5) - hash)
  }
  const colorIndex = Math.abs(hash) % COLOR_CLASSES.length
  return COLOR_CLASSES[colorIndex]
}

export function InitialsAvatar({
  name,
  title,
  className,
  textClassName,
  fallbackIcon,
  fixedColor = false,
}: Readonly<InitialsAvatarProps>) {
  const hasName = Boolean(name && name.trim())
  let colorClass = 'bg-slate-700 text-white'

  if (fixedColor) {
    colorClass = 'bg-gray-600 text-white'
  } else if (hasName) {
    colorClass = getColorClass(name)
  }
  const tooltipLabel = title ?? (hasName ? name : 'Activity')
  return (
    <Avatar
      className={cn('size-8 bg-transparent', className)}
      title={tooltipLabel}
      aria-label={tooltipLabel}
    >
      <AvatarFallback
        className={cn(
          'flex size-full items-center justify-center rounded-full text-xs font-semibold uppercase',
          colorClass,
          textClassName
        )}
      >
        {hasName ? getInitials(name) : (fallbackIcon ?? '')}
      </AvatarFallback>
    </Avatar>
  )
}

export default InitialsAvatar
