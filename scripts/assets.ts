// 构建期素材：用 sharp 确定性生成 noise.webp / hero-base.png / mist-a|b.png / favicon.svg / apple-touch-icon.png。
// 产物落 source/site/（站点根静态件的唯一家）：dev 由 vite 插件直供、build 直写 dist/——不再有 public/ 暂存层。
// ⚠ 六件都是**构建产物，不入仓**（配方 = 本文件 + site.yml 的印文 + tokens.css 的令牌）：改配置后重跑本步即可，
//   仓库里没有副本可过期。手工静态件（简历 PDF 等）才是 source/site/ 的入仓内容。见 .gitignore。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import yaml from 'js-yaml'
import { sampleScene, fadeAt, OFF_W, OFF_H } from '../src/fx/scene-data.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)
const SITE_YML = P('site.yml')

// ① 生宣 noise（mulberry32 确定性伪随机）
async function noiseWebp(): Promise<void> {
  const S = 96
  let seed = 0x2f7f3a11
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const buf = Buffer.alloc(S * S * 4)
  for (let i = 0; i < S * S; i++) {
    const v = 18 + Math.floor(rnd() * 16)
    const a = rnd() < 0.45 ? Math.floor(rnd() * 11) : 0
    buf.writeUInt8(v, i * 4)
    buf.writeUInt8(v, i * 4 + 1)
    buf.writeUInt8(v, i * 4 + 2)
    buf.writeUInt8(a, i * 4 + 3)
  }
  const out = await sharp(buf, { raw: { width: S, height: S, channels: 4 } }).webp({ lossless: true }).toBuffer()
  writeFileSync(P('source', 'site', 'noise.webp'), out)
}


async function main(): Promise<void> {
  mkdirSync(P('source', 'site'), { recursive: true })
  await noiseWebp()
  await heroBasePng()
  await mistPngs()
  await brandMarks()
}

// ⑤ 品牌印记：favicon.svg（带印文）+ apple-touch-icon.png（不带字）。
//    印文取 site.yml 的 footer.seal_text，色与字族取 tokens.css 的 --seal / --paper / --font-kai——
//    与页面上的 Seal.tsx 同源：改印文或改印朱色，标签页图标自动跟上，不再各写各的。
//    ★PNG 刻意不出字：SVG 里的 <text> 由**客户端**字体渲染（favicon 本就随机器走），
//      而 PNG 要走 sharp 光栅化——带字就得靠本机字体，缺字变豆腐、字面也随机器变。
//      只画几何底 ⇒ 产物逐字节确定，任何机器重跑都不产生假 diff。
async function brandMarks(): Promise<void> {
  // 读 site.yml 母版本身（早先读 .content/site.json，于是 dev 必须先跑 content；2026-09-26 改正源）
  if (!existsSync(SITE_YML)) {
    console.error('✗ 缺 site.yml——印文取它的 footer.seal_text')
    process.exit(1)
  }
  const site = yaml.load(readFileSync(SITE_YML, 'utf8')) as { footer?: { seal_text?: string } }
  const tokens = readFileSync(P('src', 'styles', 'tokens.css'), 'utf8')
  const token = (name: string, fallback: string): string => {
    const m = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(tokens)
    return (m?.[1] ?? fallback).trim()
  }
  const seal = token('seal', '#9e2b25')
  const paper = token('paper', '#f7f4ee')
  const fontKai = token('font-kai', 'KaiTi, serif')
  const chars = Array.from(String(site.footer?.seal_text ?? '').trim()).slice(0, 2)
  const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const face = (y: string, ch: string): string =>
    `  <text x="22" y="${y}" font-size="15" fill="${paper}" text-anchor="middle" font-family="${xml(fontKai)}">${xml(ch)}</text>`
  const mark = (withText: boolean): string =>
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">',
      // ★XML 注释里不能出现连续两个短横，故不写令牌名前缀
      '  <!-- 构建期生成（scripts/assets.ts）：印文 = site.yml footer.seal_text；色与字族 = tokens.css 的 seal / paper / font-kai 三个令牌。手改无效，改配置后重跑 npm run assets。 -->',
      `  <rect x="2" y="2" width="40" height="40" rx="8" fill="${seal}"/>`,
      `  <rect x="7" y="7" width="30" height="30" fill="none" stroke="${paper}" stroke-opacity=".45" stroke-width=".9"/>`,
      withText && chars[0] ? face('21', chars[0]) : '',
      withText && chars[1] ? face('36.5', chars[1]) : '',
      '</svg>',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n')
  writeFileSync(P('source', 'site', 'favicon.svg'), mark(true))
  const png = await sharp(Buffer.from(mark(false))).resize(180, 180).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(P('source', 'site', 'apple-touch-icon.png'), png)
}

// ③ Hero 无 JS 底图预烘
async function heroBasePng(): Promise<void> {
  const { alpha } = sampleScene(false, 1)
  const buf = Buffer.alloc(OFF_W * OFF_H * 4)
  for (let y = 0; y < OFF_H; y++) {
    for (let x = 0; x < OFF_W; x++) {
      const a = (alpha[y * OFF_W + x] as number) * fadeAt(x, y)
      const i = (y * OFF_W + x) * 4
      buf.writeUInt8(20, i)
      buf.writeUInt8(22, i + 1)
      buf.writeUInt8(26, i + 2)
      buf.writeUInt8(Math.round(Math.min(0.92, Math.pow(a, 1.6) * 0.95) * 255), i + 3)
    }
  }
  const out = await sharp(buf, { raw: { width: OFF_W, height: OFF_H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(P('source', 'site', 'hero-base.png'), out)
}

// ④ 云雾层预模糊 PNG
async function mistPngs(): Promise<void> {
  const strip = (blobs: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180"><rect width="720" height="180" fill="transparent"/>${blobs}</svg>`
  const a = strip(
    `<ellipse cx="210" cy="100" rx="190" ry="52" fill="rgba(20,22,26,.55)"/><ellipse cx="520" cy="80" rx="150" ry="40" fill="rgba(20,22,26,.4)"/>`,
  )
  const b = strip(
    `<ellipse cx="330" cy="90" rx="230" ry="46" fill="rgba(20,22,26,.5)"/><ellipse cx="640" cy="110" rx="130" ry="36" fill="rgba(20,22,26,.35)"/>`,
  )
  for (const [name, svg] of [
    ['mist-a.png', a],
    ['mist-b.png', b],
  ] as const) {
    const out = await sharp(Buffer.from(svg)).blur(16).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(P('source', 'site', name), out)
  }
}
main().catch((e: unknown) => {
  console.error(`✗ assets 失败：${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
