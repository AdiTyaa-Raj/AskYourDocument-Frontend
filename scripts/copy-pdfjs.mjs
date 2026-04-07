import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const sourceDir = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
const targetDir = path.join(rootDir, 'public', 'pdfjs')
const files = ['pdf.mjs', 'pdf.worker.min.mjs']

const copyAssets = async () => {
  await fs.mkdir(targetDir, { recursive: true })
  await Promise.all(
    files.map(async (file) => {
      await fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file))
    })
  )
  console.log(`Copied PDF.js assets to ${targetDir}`)
}

copyAssets().catch((error) => {
  console.error('Failed to copy PDF.js assets', error)
  process.exit(1)
})
