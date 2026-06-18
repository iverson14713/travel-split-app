import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const source = path.join(root, 'resources', 'icon.png')
const outDir = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')

/** Contents.json entries; multiple entries may share the same filename when pixel size matches. */
const catalog = [
  { filename: 'AppIcon-20@2x.png', idiom: 'iphone', scale: '2x', size: '20x20', pixels: 40 },
  { filename: 'AppIcon-20@3x.png', idiom: 'iphone', scale: '3x', size: '20x20', pixels: 60 },
  { filename: 'AppIcon-29@2x.png', idiom: 'iphone', scale: '2x', size: '29x29', pixels: 58 },
  { filename: 'AppIcon-29@3x.png', idiom: 'iphone', scale: '3x', size: '29x29', pixels: 87 },
  { filename: 'AppIcon-40@2x.png', idiom: 'iphone', scale: '2x', size: '40x40', pixels: 80 },
  { filename: 'AppIcon-40@3x.png', idiom: 'iphone', scale: '3x', size: '40x40', pixels: 120 },
  { filename: 'AppIcon-60@2x.png', idiom: 'iphone', scale: '2x', size: '60x60', pixels: 120 },
  { filename: 'AppIcon-60@3x.png', idiom: 'iphone', scale: '3x', size: '60x60', pixels: 180 },
  { filename: 'AppIcon-20@1x.png', idiom: 'ipad', scale: '1x', size: '20x20', pixels: 20 },
  { filename: 'AppIcon-20@2x.png', idiom: 'ipad', scale: '2x', size: '20x20', pixels: 40 },
  { filename: 'AppIcon-29@1x.png', idiom: 'ipad', scale: '1x', size: '29x29', pixels: 29 },
  { filename: 'AppIcon-29@2x.png', idiom: 'ipad', scale: '2x', size: '29x29', pixels: 58 },
  { filename: 'AppIcon-40@1x.png', idiom: 'ipad', scale: '1x', size: '40x40', pixels: 40 },
  { filename: 'AppIcon-40@2x.png', idiom: 'ipad', scale: '2x', size: '40x40', pixels: 80 },
  { filename: 'AppIcon-76@1x.png', idiom: 'ipad', scale: '1x', size: '76x76', pixels: 76 },
  { filename: 'AppIcon-76@2x.png', idiom: 'ipad', scale: '2x', size: '76x76', pixels: 152 },
  { filename: 'AppIcon-83.5@2x.png', idiom: 'ipad', scale: '2x', size: '83.5x83.5', pixels: 167 },
  { filename: 'AppIcon-1024.png', idiom: 'ios-marketing', scale: '1x', size: '1024x1024', pixels: 1024 },
]

const webIcons = [
  { filename: 'favicon-32.png', size: 32 },
  { filename: 'favicon-192.png', size: 192 },
  { filename: 'apple-touch-icon.png', size: 180 },
]

await fs.mkdir(outDir, { recursive: true })

const metadata = await sharp(source).metadata()
console.log(`Source icon: ${metadata.width}x${metadata.height}`)

const base = sharp(source)

const filesToGenerate = new Map()
for (const entry of catalog) {
  if (!filesToGenerate.has(entry.filename)) {
    filesToGenerate.set(entry.filename, entry.pixels)
  }
}

for (const [filename, pixels] of filesToGenerate) {
  const target = path.join(outDir, filename)
  await base
    .clone()
    .resize(pixels, pixels, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(target)
  console.log(`Wrote ios/${filename} (${pixels}px)`)
}

const contents = {
  images: catalog.map(({ filename, idiom, scale, size }) => ({
    filename,
    idiom,
    scale,
    size,
  })),
  info: { author: 'xcode', version: 1 },
}

await fs.writeFile(path.join(outDir, 'Contents.json'), `${JSON.stringify(contents, null, 2)}\n`)

const publicDir = path.join(root, 'public')
for (const icon of webIcons) {
  const target = path.join(publicDir, icon.filename)
  await base
    .clone()
    .resize(icon.size, icon.size, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(target)
  console.log(`Wrote public/${icon.filename}`)
}

console.log('Done.')
