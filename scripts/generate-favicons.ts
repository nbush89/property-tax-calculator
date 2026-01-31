/* eslint-disable no-console */
/**
 * Generate favicon set from public/logo-icon.png.
 * Run: npm run generate-favicons
 *
 * Outputs in public/:
 *   favicon.ico (multi-size: 16, 32, 48)
 *   favicon-16x16.png
 *   favicon-32x32.png
 *   apple-touch-icon.png (180x180)
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const ROOT = process.cwd()
const PUBLIC = path.join(ROOT, 'public')
const SRC = path.join(PUBLIC, 'logo-icon.png')

const SIZES = [
  { name: 'favicon-16x16.png', w: 16, h: 16 },
  { name: 'favicon-32x32.png', w: 32, h: 32 },
  { name: 'favicon-48x48.png', w: 48, h: 48 },
  { name: 'apple-touch-icon.png', w: 180, h: 180 },
] as const

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source image not found:', SRC)
    process.exit(1)
  }

  const pipeline = sharp(SRC)
  const pngs: { name: string; w: number; h: number; buffer: Buffer }[] = []

  for (const { name, w, h } of SIZES) {
    const buffer = await pipeline.clone().resize(w, h).png().toBuffer()
    pngs.push({ name, w, h, buffer })
  }

  // Write PNGs (16, 32, 48 for ico; 16, 32, 180 for public)
  const favicon48Path = path.join(os.tmpdir(), 'favicon-48x48.png')
  for (const { name, buffer } of pngs) {
    const out = name === 'favicon-48x48.png' ? favicon48Path : path.join(PUBLIC, name)
    fs.writeFileSync(out, buffer)
    if (name !== 'favicon-48x48.png') console.log('Wrote', name)
  }

  // Build favicon.ico from 16, 32, 48 (png-to-ico expects file paths)
  const icoPaths = [
    path.join(PUBLIC, 'favicon-16x16.png'),
    path.join(PUBLIC, 'favicon-32x32.png'),
    favicon48Path,
  ]
  const ico = await pngToIco(icoPaths)
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico)
  fs.unlinkSync(favicon48Path)
  console.log('Wrote favicon.ico')

  console.log('Favicon set generated.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
