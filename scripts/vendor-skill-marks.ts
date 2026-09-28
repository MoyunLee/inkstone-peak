/* 技能行图标母版的 vendoring 工具 —— **手动运行，不进构建链**（构建期永不联网）。
 *
 * 用法：node scripts/vendor-skill-marks.ts
 * 作用：按下面 ICONS 清单从 Iconify 抓**单色版**标，清洗成独立 SVG 文件写进 source/site/skill/。
 *       该目录在 Vite publicDir 之下 → 发布后就是 /skill/<文件名>，与手工丢进去的图同一条路。
 *
 * 图标怎么用：运行时用 CSS mask 取**形状（alpha 通道）**、颜色由站点给（跟随方章 color），
 * 所以文件本身什么颜色不重要，但必须满足两条：
 *   ① 透明底 —— 不透明底色会被 mask 成实心方块；JPEG 没有 alpha，别放；
 *   ② 形状之间不互相遮盖 —— 同色叠一起会并成一块。官方「彩色版」常是「底色方块 + 上面画字」，
 *      所以必须取 devicon-plain / simple-icons / thesvg 这类单色版；清单里的 drop 给个别标去掉底色板，
 *      crop 则在图形只占画布一小块时收紧取景（不收紧，页面上会比邻条小一圈）。
 *
 * 加一枚标：清单加一行 → 跑本脚本 → site.yml 的 icon 写文件名（如 photoshop.svg）。
 * 完全手工也行：把透明底的 SVG / PNG / WebP 丢进 source/site/skill/，site.yml 写文件名即可 ——
 * 写错名字构建期会直接报错并列出目录里现有的文件名。
 * 许可与商标：清单里的许可是来源标注；商标归各自权利人，此处仅作指名使用（nominative use）。
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { P } from './content/paths.ts'

const OUT_DIR = P('source', 'site', 'skill')
/** 发布出来的 URL 前缀（= publicDir 根下的目录名），文档与前端登记表都写这个。 */
export const ICON_DIR = 'skill'

/** 文件名 · Iconify id · 产品名 · 许可 · 要丢掉的 path 序号（1 基；默认 0 个）· 取景 viewBox（默认沿用原图）。 */
const ICONS: [string, string, string, string, number[]?, [number, number, number, number]?][] = [
  ['photoshop.svg', 'devicon-plain:photoshop', 'Adobe Photoshop', 'devicon-plain（MIT）'],
  ['aftereffects.svg', 'devicon-plain:aftereffects', 'Adobe After Effects', 'devicon-plain（MIT）'],
  ['premierepro.svg', 'devicon-plain:premierepro', 'Adobe Premiere Pro', 'devicon-plain（MIT）'],
  ['3dsmax.svg', 'devicon-plain:3dsmax', 'Autodesk 3ds Max', 'devicon-plain（MIT）'],
  ['cinema4d.svg', 'simple-icons:cinema4d', 'Maxon Cinema 4D', 'simple-icons（CC0 1.0）'],
  ['unrealengine.svg', 'simple-icons:unrealengine', 'Unreal Engine', 'simple-icons（CC0 1.0）'],
  ['c.svg', 'simple-icons:c', 'C 语言', 'simple-icons（CC0 1.0）'],
  ['hunyuan.svg', 'thesvg:hunyuan', '腾讯混元（3D 生成）', 'thesvg（MIT）'],
  ['jimeng.svg', 'thesvg:jimeng', '即梦', 'thesvg（MIT）'],
  ['substance-3d-painter.svg', 'thesvg-color:substance-3d-painter', 'Adobe Substance 3D Painter', 'thesvg-color（MIT，已去掉底色方块、只留图形本身，并收紧取景）', [1], [6, 7, 20, 16]],
]

/** 原始 SVG → 可独立打开的墨色 SVG：去 xml/注释、kebab 属性转驼峰、色值统一 currentColor（保留 fill="none"）。 */
function toInkSvg(raw: string): { viewBox: string; inner: string } {
  const svg = raw.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const open = /<svg([^>]*)>/.exec(svg)
  if (!open) throw new Error('不是 svg？')
  const openTag = open[0] ?? ''
  const viewBox = /<svg[^>]*viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 0 24 24'
  const inner = svg
    .slice(open.index + openTag.length, svg.lastIndexOf('</svg>'))
    .replace(/\s(?:xmlns|width|height|role|aria-hidden|focusable)="[^"]*"/g, '')
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/g, 'stroke="currentColor"')
    .replace(/>\s+</g, '><')
    .trim()
  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(inner)) throw new Error(`清洗后仍有硬编码色值：${viewBox}`)
  return { viewBox, inner }
}

mkdirSync(OUT_DIR, { recursive: true })
const written: string[] = []
for (const [file, id, product, license, drop, crop] of ICONS) {
  const [prefix, name] = id.split(':')
  if (!prefix || !name) throw new Error(`${id} 不是 <集>:<标名> 形式`)
  const res = await fetch(`https://api.iconify.design/${prefix}/${name}.svg?height=64`)
  if (!res.ok) throw new Error(`${id} 抓取失败：HTTP ${res.status}（单色版可能不存在，别退而用彩色版）`)
  let { viewBox, inner } = toInkSvg(await res.text())
  if (drop?.length) {
    let i = 0
    inner = inner.replace(/<path\b[^>]*?\/?>/g, (m) => {
      i += 1
      return drop.includes(i) ? '' : m
    })
  }
  // 取景：有些官方标画在超大画布里、图形只占中间一小块，而运行时是 mask `contain`（按 viewBox 铺满方章）
  // ⇒ 不收紧的话，页面上就比邻条小一圈。crop 写 [x, y, w, h]（原图用户单位，由探针 .shots/probe-skill-ink.mjs 量）。
  if (crop) viewBox = crop.join(' ')
  // 独立文件要自带 xmlns（运行时当图片/mask 加载）；根上给 currentColor，单独打开时是墨色。
  const svg = `<!-- ${product} — ${license}；商标归权利人，此处仅作指名使用。由 scripts/vendor-skill-marks.ts 生成，勿手改。 -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${inner}</svg>\n`
  writeFileSync(P('source', 'site', 'skill', file), svg)
  written.push(`${file}（${product}，${viewBox}）`)
}

const known = new Set(ICONS.map(([f]) => f))
const extra = readdirSync(OUT_DIR).filter((f) => !known.has(f))
console.log(`已写入 source/site/skill/：${written.length} 件`)
console.log(written.map((w) => `  · ${w}`).join('\n'))
console.log(extra.length > 0 ? `目录里另有 ${extra.length} 个手工件（不由本清单管理，本脚本不碰）：${extra.join('、')}` : '目录里没有手工件')
console.log(existsSync(OUT_DIR) ? '' : '（警告：输出目录不存在）')