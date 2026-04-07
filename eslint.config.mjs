import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default compat.config({
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'react-hooks'],
  extends: [
    // Use *-legacy configs: flat `name` fields in non-legacy plugin configs break FlatCompat on ESLint 9
    'plugin:@next/next/core-web-vitals-legacy',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'out/',
    'coverage/',
    'public/pdfjs/',
    'next-env.d.ts',
    '*.config.js',
    '*.config.mjs',
    'pnpm-lock.yaml',
  ],
  rules: {
    // Register hook rules so eslint-disable comments resolve; keep stricter React Compiler rules off for this codebase
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'prettier/prettier': ['warn', { endOfLine: 'auto' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
})
