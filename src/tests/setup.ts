import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (!globalThis.URL.createObjectURL) {
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock'),
    writable: true,
  })
}

if (!globalThis.URL.revokeObjectURL) {
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  })
}
