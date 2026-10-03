/* OG 分享卡（默认卡）的出图配方 —— **手动运行，不进构建链**。
 *
 * 用法：node scripts/og-card.ts
 * 作用：现读 site.yml + tokens.css，出一张 1200×630 的 source/site/og/default.png。
 *       该目录在 Vite publicDir 之下 ⇒ 发布后就是 /og/default.png，pre-render 逐路由把它写进 og:image。
 *
 * 为什么是「手动出图 + 图入仓」而不是构建期产物（与 scripts/assets.ts 那六件的取向**刚好相反**）：
 *   PNG 里的字要经 sharp 光栅化，就依赖**本机字体**——缺字变豆腐、字面也随机器变。
 *   assets.ts 靠「只画几何底、不出字」换来确定性；本卡必须出字（站名 / 作者 / 域名 / 定位句），
 *   所以反过来把图当**手工静态件入仓**（与简历 PDF 同类）：构建链不动、CI 不依赖字体、产物逐字节稳定。
 *   代价：改了站名 / 作者 / 定位句 / 印文 / 色令牌而忘了重跑本脚本，卡面会慢一拍（不报错，只是旧）。
 *
 * 卡面只用**有事实源**的东西：站名 · 作者 · site.description · 域名 · 印文。
 * 刻意不写「职业」——站点没有这一键（about.tags_left 是标签不是职务），别在卡上编一句。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import yaml from 'js-yaml'
import { P } from './content/paths.ts'

const SITE_YML = P('site.yml')
const OUT_DIR = P('source', 'site', 'og')
const OUT = P('source', 'site', 'og', 'default.png')
const W = 1200
const H = 630

if (!existsSync(SITE_YML)) {
  console.error('✗ 缺 site.yml——站名 / 作者 / 定位句 / 域名 / 印文都取它')
  process.exit(1)
}
const cfg = yaml.load(readFileSync(SITE_YML, 'utf8')) as {
  site?: { title?: string; author?: string; description?: string; url?: string }
  footer?: { seal_text?: string }
}
const title = String(cfg.site?.title ?? '').trim()
const author = String(cfg.site?.author ?? '').trim()
const description = String(cfg.site?.description ?? '').trim()
const host = String(cfg.site?.url ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
if (!title || !author) {
  console.error('✗ site.yml 的 site.title / site.author 不能为空（卡面就靠这两行字）')
  process.exit(1)
}

const tokens = readFileSync(P('src', 'styles', 'tokens.css'), 'utf8')
const token = (name: string, fallback: string): string => {
  const m = new RegExp('--' + name + '\\s*:\\s*([^;]+);').exec(tokens)
  return (m?.[1] ?? fallback).trim()
}
const paper = token('paper', '#f7f4ee')
const ink = token('ink', '#14161a')
const ink2 = token('ink-2', '#3e4148')
const ink3 = token('ink-3', '#8a8d93')
const seal = token('seal', '#9e2b25')
const fontKai = token('font-kai', 'KaiTi, serif')

// 文本内容与**属性值**共用：引号也要转义，否则带双引号的令牌会把 SVG 属性提前闭合
const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const text = (x: number, y: number, size: number, fill: string, body: string): string =>
  '  <text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '" font-family="' + xml(fontKai) + '">' + xml(body) + '</text>'

// 印章：与 scripts/assets.ts 的 favicon.svg 同一套几何（外朱方 + 内白细线 + 印文竖排），只是放大
const SEAL = 132
const chars = Array.from(String(cfg.footer?.seal_text ?? '').trim()).slice(0, 2)
const sealSvg = (withText: boolean, left: number, top: number): string => {
  return [
    '  <rect x="' + left + '" y="' + top + '" width="' + SEAL + '" height="' + SEAL + '" rx="18" fill="' + seal + '"/>',
    '  <rect x="' + (left + 16) + '" y="' + (top + 16) + '" width="' + (SEAL - 32) + '" height="' + (SEAL - 32) + '" fill="none" stroke="' + paper + '" stroke-opacity=".45" stroke-width="1.6"/>',
    withText && chars[0] ? '  <text x="' + (left + SEAL / 2) + '" y="' + (top + 66) + '" font-size="42" fill="' + paper + '" text-anchor="middle" font-family="' + xml(fontKai) + '">' + xml(chars[0]) + '</text>' : '',
    withText && chars[1] ? '  <text x="' + (left + SEAL / 2) + '" y="' + (top + 112) + '" font-size="42" fill="' + paper + '" text-anchor="middle" font-family="' + xml(fontKai) + '">' + xml(chars[1]) + '</text>' : '',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

// 版心：印 + 站名 + 发丝线 + 定位句 作为一组**水平居中**（估算字宽即可——这一版是手工出图，肉眼为准）；
// 底边一行（作者 · 域名）单独贴左下，像页脚题注。
const est = (body: string): number => {
  let w = 0
  for (const ch of Array.from(body)) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55
  return w
}
const TITLE_SIZE = 128
const DESC_SIZE = 38
const TITLE_Y = 330
const RULE_Y = 356
const DESC_Y = 420
const groupW = SEAL + 56 + Math.max(est(title) * TITLE_SIZE, description ? est(description) * DESC_SIZE : 0)
const X = Math.round((W - groupW) / 2) + SEAL + 56
const sealLeft = X - 56 - SEAL
const sealTop = TITLE_Y - Math.round(TITLE_SIZE * 0.5) - Math.round(SEAL / 2)

const svg =
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
    '  <rect width="' + W + '" height="' + H + '" fill="' + paper + '"/>',
    '  <rect x="26" y="26" width="' + (W - 52) + '" height="' + (H - 52) + '" fill="none" stroke="' + ink + '" stroke-opacity=".14" stroke-width="1"/>',
    sealSvg(true, sealLeft, sealTop),
    text(X, TITLE_Y, TITLE_SIZE, ink, title),
    '  <rect x="' + X + '" y="' + RULE_Y + '" width="104" height="4" fill="' + seal + '"/>',
    description ? text(X, DESC_Y, DESC_SIZE, ink2, description) : '',
    text(104, H - 62, 26, ink3, [author, host].filter(Boolean).join(' · ')),
    '</svg>',
    '',
  ]
    .filter((l) => l !== '')
    .join('\n')

mkdirSync(OUT_DIR, { recursive: true })
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(OUT, png)
console.log('✓ OG 默认卡 ' + OUT.replace(P() + '\\', '').replace(/\\/g, '/') + '  ' + W + '×' + H + '  ' + (png.length / 1024).toFixed(1) + ' KB（改站名 / 作者 / 定位句 / 印文 / 令牌后重跑本脚本）')
