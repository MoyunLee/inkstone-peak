/* 技能行首方章里的「用途字形」登记表：site.yml 写 lucide 名（kebab），这里映射到组件。
   字形是纯装饰（名字就在同一行右侧），所以调用方一律 aria-hidden，不进读屏。
   未知名回落 circle —— 与站点一贯的「未知回落默认」同策（老的分组图标也是这个规矩）：
   写错字形名时画面上是中性圆点，而不是白框或空白；也因此不必为字形名再立一条构建期硬校验。 */
import { Box, Brush, Circle, Code, Gamepad2, Image, Layers, MessageSquare, Palette, Rotate3d, Scissors, Shapes, Sparkles } from 'lucide-react'
import type { ComponentType } from 'react'

/** 字形组件的最小形状：只用到这两个 props，故不绑 lucide 自己的类型导出。 */
export type GlyphComponent = ComponentType<{ size?: number; strokeWidth?: number }>

/** lucide 名 → 组件。加字形＝这里加一行 + 在 site.yml 引用它的名字。 */
const GLYPHS: Record<string, GlyphComponent> = {
  box: Box,
  brush: Brush,
  'rotate-3d': Rotate3d,
  sparkles: Sparkles,
  image: Image,
  scissors: Scissors,
  'message-square': MessageSquare,
  shapes: Shapes,
  layers: Layers,
  palette: Palette,
  'gamepad-2': Gamepad2,
  code: Code,
}

/** 缺省字形：site.yml 未给 icon、或给了未登记的名字时使用。 */
export const FALLBACK_GLYPH: GlyphComponent = Circle

/**
 * 取字形组件。
 *
 * @param icon site.yml 里写的 lucide 名（kebab）；可缺省。
 * @returns 命中的组件；未登记或未给时回落 {@link FALLBACK_GLYPH}。
 */
export function skillGlyph(icon?: string): GlyphComponent {
  return (icon ? GLYPHS[icon] : undefined) ?? FALLBACK_GLYPH
}