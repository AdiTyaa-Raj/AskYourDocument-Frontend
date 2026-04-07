// components/common/InfoCard.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import clsx from 'clsx'

interface InfoCardProps {
  title: string
  children: React.ReactNode
  contentClassName?: string
}

export function InfoCard({ title, children, contentClassName = 'space-y-3' }: InfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}

interface InfoRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={clsx('flex items-center justify-between text-xs', className)}>
      <span className="text-gray-500 dark:text-gray-400">{label}</span>

      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
        {value}
      </div>
    </div>
  )
}
