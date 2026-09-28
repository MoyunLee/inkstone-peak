/* 技能行首方章的图标解析：site.yml 里写**文件名**（住 source/site/skill/，发布后 = /skill/<文件名>），
   或写 'lucide:' 前缀的兜底字形 id。
   为什么文件走 mask 而不是 <img>：本站图标一律是墨色（跟随方章 color、悬停转本档色阶），而 <img> 会原样
   显示图片自己的颜色。mask 只取形状（alpha 通道）、颜色交给 CSS —— 于是往 source/site/skill/ 里丢彩色 Logo
   也好、黑白剪影也好，页面上都统一成墨色。代价：图片必须有透明底（不透明底 = 整块实心方块，JPEG 没有 alpha）。
   两种来源的分工：文件名 = 你自己换的图（含官方单色标，由 scripts/vendor-skill-marks.ts 抓取）；
   'lucide:' = 「拿不到官方标」的兜底字形（ZBrush 全网只剩一个文件类型图标、提示词工程根本不是软件）。
   未给 icon 才回落 circle（中性圆点）；文件名写错会在**构建期直接报错**（见 scripts/content/build.ts）。 */
import { Brush, Circle, MessageSquare } from 'lucide-react'
import type { ComponentType } from 'react'

/** 图标形状：兜底字形吃 size / strokeWidth；文件式图标不吃 props（尺寸与颜色全交 CSS）。 */
export type IconShape = ComponentType<{ size?: number; strokeWidth?: number }>

/** 图标文件在站点上的 URL 前缀（= source/site/skill/ 这个目录名）。 */
export const ICON_URL_PREFIX = '/skill/'

/** 'lucide:' 前缀 → 兜底字形。只收「不存在官方标」的条目。 */
const GLYPHS: Record<string, IconShape> = {
  'lucide:brush': Brush,
  'lucide:message-square': MessageSquare,
}

/** 缺省图标：site.yml 未给 icon 时使用。 */
export const FALLBACK_ICON: IconShape = Circle

/** 解析结果：文件式（mask 上色）或字形式（直接画组件）。 */
export type SkillIcon = { kind: 'file'; url: string } | { kind: 'glyph'; Glyph: IconShape }

/**
 * 解析 site.yml 里写的 icon。
 *
 * 含「:」= 内置 id（目前只有 lucide: 兜底字形，未登记则回落 circle）；其余一律当 source/site/skill/
 * 下的文件名，发布后从 {@link ICON_URL_PREFIX} 取 —— 那类名字的落盘由构建期硬校验把关。
 *
 * @param icon site.yml 里的 icon 值；可缺省。
 */
export function skillIcon(icon?: string): SkillIcon {
  if (icon && icon.includes(':')) return { kind: 'glyph', Glyph: GLYPHS[icon] ?? FALLBACK_ICON }
  if (icon) return { kind: 'file', url: `${ICON_URL_PREFIX}${icon}` }
  return { kind: 'glyph', Glyph: FALLBACK_ICON }
}