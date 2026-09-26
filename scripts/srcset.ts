// 封面多档（2026-09-26）：source/images 里一张母版 → 交付时多档 WebP。
//
// 三条口径：
//   ① 档位写死在 TIERS，**绝不放大**——宽 ≥ 母版宽的一律不出（小图就该是小图）；
//   ② 最大一档恒为母版自身，不重编码（画质零损失，字节也不重复）；
//   ③ 变体文件**不落 source/**：源目录保持「源即输入」。build 由 vite 插件写进 dist/、
//      dev 由同一个插件按需现出（见 vite.config.ts 的 staticFromSource）——
//      故本模块只出「一份清单 + 一个出图函数」，两侧共用同一实现。
//
// sharp 一律动态 import：本模块被 vite.config.ts 静态引用，静态引 sharp 会给每次 dev / build 启动加一笔无谓开销。
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import type { ImageManifest, ImageVariant, ResponsiveImage } from '../src/lib/types/images.ts'

/** 档位（像素宽）。三档覆盖「列表卡 1x / 列表卡与顶图 2x / 版心 1x」；
 *  再往上靠母版本身——母版更大时只需往这里加一档，清单与产物自动跟上。 */
export const TIERS = [480, 800, 1280] as const

/** 清单落点（相对项目根；`.content/` 不进发布产物，与 posts.json 同处）。 */
export const MANIFEST_REL = '.content/images.json'

/** 某个交付地址是不是变体；是就返回它的宽度，否则 null。 */
export function variantWidthOf(url: string): number | null {
  const m = /\.w(\d+)\.webp$/i.exec(url)
  return m ? Number(m[1]) : null
}

/** 变体地址 → 它的母版地址（本身不是变体则原样返回）。 */
export function masterUrlOf(url: string): string {
  return url.replace(/\.w\d+\.webp$/i, '.webp')
}

/** 母版交付地址 → 某一档的交付地址。 */
export function variantUrlOf(masterUrl: string, w: number): string {
  return masterUrl.replace(/\.webp$/i, '.w' + String(w) + '.webp')
}

/** 按档位降采样出 WebP（有损 q82：与 assets.ts 出图的取向一致——视觉无损、字节明显更省）。 */
export async function renderVariant(absMaster: string, w: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp')
  return sharp(absMaster).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
}

/** 读一张母版的宽高与档位表；宽高读不出来返回 null（调用方记账，不在这里吞掉）。 */
async function planOne(absMaster: string, url: string): Promise<ResponsiveImage | null> {
  const { default: sharp } = await import('sharp')
  const meta = await sharp(absMaster).metadata()
  if (!meta.width || !meta.height) return null
  const variants: ImageVariant[] = []
  for (const t of TIERS) if (t < meta.width) variants.push({ src: variantUrlOf(url, t), w: t })
  return { src: url, w: meta.width, h: meta.height, variants }
}

/**
 * 扫 `source/images/**` 出清单。
 *
 * 跳过与 media 闸同一口径的「工具残留」（`.` 开头 / 名字含 `~`），只收栅格图后缀；
 * 键按交付地址升序、不含时间戳——同一批源每次产出同一份字节，diff 才干净。
 *
 * @param imagesDir source/images 的绝对路径。
 * @returns manifest 与「读不出宽高」的那些相对路径（交给 media 闸记进报告，不静默）。
 * @example
 * const { manifest, unreadable } = await planImages(path.join(SOURCE, 'images'))
 */
export async function planImages(imagesDir: string): Promise<{ manifest: ImageManifest; unreadable: string[] }> {
  const manifest: ImageManifest = {}
  const unreadable: string[] = []
  if (!existsSync(imagesDir)) return { manifest, unreadable }
  const rels: string[] = []
  const walk = (dir: string, base: string): void => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name.includes('~')) continue
      const abs = path.join(dir, name)
      const rel = base === '' ? name : base + '/' + name
      if (statSync(abs).isDirectory()) walk(abs, rel)
      else if (/\.(webp|png|jpe?g|avif)$/i.test(name)) rels.push(rel)
    }
  }
  walk(imagesDir, '')
  for (const rel of rels.sort()) {
    const url = '/images/' + rel
    try {
      const one = await planOne(path.resolve(imagesDir, ...rel.split('/')), url)
      if (one) manifest[url] = one
      else unreadable.push(rel)
    } catch {
      unreadable.push(rel)
    }
  }
  return { manifest, unreadable }
}
