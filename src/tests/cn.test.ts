import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges classnames and de-dupes Tailwind conflicts', () => {
    const result = cn('p-2', 'p-4', ['text-sm', false && 'hidden'])
    expect(result).toContain('p-4')
    expect(result).not.toContain('p-2 ')
    expect(result).toContain('text-sm')
  })
})
