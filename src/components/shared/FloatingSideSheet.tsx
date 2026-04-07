'use client'

import * as React from 'react'

import { SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type FloatingSideSheetContentProps = React.ComponentProps<typeof SheetContent>

export function FloatingSideSheetContent({
  className,
  side = 'right',
  ...props
}: FloatingSideSheetContentProps) {
  return (
    <SheetContent
      side={side}
      className={cn(
        'top-4 right-4 w-[600px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white shadow-2xl',
        'max-h-[calc(100vh-32px)]',
        className
      )}
      {...props}
    />
  )
}

export type { FloatingSideSheetContentProps }
