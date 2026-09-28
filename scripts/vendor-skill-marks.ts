/* 技能行墨标的 vendoring 工具 —— **手动运行，不进构建链**（构建期永不联网）。
 *
 * 用法：node scripts/vendor-skill-marks.ts
 * 作用：按下面 MARKS 清单从 Iconify 抓单色版 SVG，清洗成 JSX，整文件重写
 *       src/components/about/skills/skillMarks.tsx（产物勿手改）。
 *
 * 为什么必须取「单色版」（devicon-plain / simple-icons / thesvg / thesvg 的非 -color 变体）：
 * 彩色版靠多色对比撑形状，统一成 currentColor 后会糊成实心块 —— Substance 3D Painter 原版是
 * 「底色方块 + 上面画字」，同色即糊，故清单里给它记了 drop=[1] 去掉底色板。
 *
 * 加一枚标的三步：本清单加一行 → 跑本脚本 → 在
 * src/components/about/skills/skillIcon.ts 的 ICONS 里加一行 → site.yml 的 icon 引用该 id。
 * 许可与来源由本清单生成进产物文件头；商标归各自权利人，此处仅作指名使用（nominative use）。
 */
import { writeFileSync } from 'node:fs'

const OUT = 'src/components/about/skills/skillMarks.tsx'
const CDN = 'https://api.iconify.design'

/** 组件名 · Iconify id · 产品名 · 许可 · 要丢掉的 path 序号（1 基；默认 0 个）。 */
const MARKS: [string, string, string, string, number[]?][] = [
  ['PhotoshopMark', 'devicon-plain:photoshop', 'Adobe Photoshop', 'devicon-plain（MIT）'],
  ['AfterEffectsMark', 'devicon-plain:aftereffects', 'Adobe After Effects', 'devicon-plain（MIT）'],
  ['PremiereProMark', 'devicon-plain:premierepro', 'Adobe Premiere Pro', 'devicon-plain（MIT）'],
  ['Max3dsMark', 'devicon-plain:3dsmax', 'Autodesk 3ds Max', 'devicon-plain（MIT）'],
  ['Cinema4DMark', 'simple-icons:cinema4d', 'Maxon Cinema 4D', 'simple-icons（CC0 1.0）'],
  ['UnrealEngineMark', 'simple-icons:unrealengine', 'Unreal Engine', 'simple-icons（CC0 1.0）'],
  ['CLangMark', 'simple-icons:c', 'C 语言', 'simple-icons（CC0 1.0）'],
  ['HunyuanMark', 'thesvg:hunyuan', '腾讯混元（3D 生成）', 'thesvg（MIT）'],
  ['JimengMark', 'thesvg:jimeng', '即梦', 'thesvg（MIT）'],
  ['SubstancePainterMark', 'thesvg-color:substance-3d-painter', 'Adobe Substance 3D Painter', 'thesvg-color（MIT，已去掉底色方块，只留图形本身）', [1]],
]

/** 原始 SVG → JSX 内层：去 xml/注释、kebab 属性转驼峰、色值统一 currentColor（保留 fill="none"）。 */
function toJsx(raw: string): { viewBox: string; inner: string } {
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
    .replace(/([a-zA-Z]+)-([a-zA-Z-]+)=/g, (_m, a: string, b: string) => `${a}${b.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}=`)
    .replace(/>\s+</g, '><')
    .trim()
  if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(inner)) throw new Error(`清洗后仍有硬编码色值：${viewBox}`)
  return { viewBox, inner }
}

const marks: { name: string; product: string; license: string; viewBox: string; inner: string }[] = []
for (const [name, id, product, license, drop] of MARKS) {
  const [prefix, icon] = id.split(':')
  if (!prefix || !icon) throw new Error(`${id} 不是 <集>:<标名> 形式`)
  const res = await fetch(`${CDN}/${prefix}/${icon}.svg?height=64`)
  if (!res.ok) throw new Error(`${id} 抓取失败：HTTP ${res.status}（单色版可能不存在，别退而用彩色版）`)
  let { viewBox, inner } = toJsx(await res.text())
  if (drop?.length) {
    let i = 0
    inner = inner.replace(/<path\b[^>]*?\/?>/g, (m) => {
      i += 1
      return drop.includes(i) ? '' : m
    })
  }
  marks.push({ name, product, license, viewBox, inner })
}

const header = `/* 技能行方章里的软件墨标（vendored 资产，不是依赖；由 scripts/vendor-skill-marks.ts 生成，勿手改）。
   为什么能单色：各集本来就有单路径单色的「plain」版，fill 直接是 currentColor，所以标会跟随方章自身的
   color —— 悬停转本档色阶时标一起变色，且不存在彩色版强行墨化那种糊成一坨的问题。
   来源与许可（原始 SVG 只做了三处改动：去 <xml>/宽高属性、kebab 属性转 JSX、色值统一 currentColor）：
${marks.map((m) => `     · ${m.product} — ${m.license}`).join('\n')}
   商标归各自权利人所有；此处仅作指名使用（nominative use），不表示任何关联或背书。 */
`

const body = marks
  .map(
    (m) => `
/** ${m.product} —— 单色墨标，跟随外层 color。 */
export const ${m.name} = () => (
  <svg viewBox="${m.viewBox}" fill="currentColor" aria-hidden="true">
    ${m.inner}
  </svg>
)`,
  )
  .join('\n')

writeFileSync(OUT, header + body + '\n')
console.log(`已写入 ${OUT}：${marks.length} 枚标`)
console.log(marks.map((m) => `${m.name} viewBox=${m.viewBox}`).join('\n'))