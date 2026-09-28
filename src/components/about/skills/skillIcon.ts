/* 技能行首方章的图标登记表：site.yml 写 Iconify 风格 id，这里映射到组件。
   两类来源：
     · 软件官方墨标（vendored 单色版，见 skillMarks.tsx）—— devicon-plain: / simple-icons: / thesvg: / thesvg-color:
     · 用途字形兜底（lucide:）—— 只给「拿不到官方标」的条目：ZBrush 全网只剩一个文件类型图标（不是品牌标），
       提示词工程根本不是软件。
   未登记或写错名一律回落 circle（中性圆点，不是白框），故不为图标名再立一条构建期硬校验。 */
import { Brush, Circle, MessageSquare } from 'lucide-react'
import type { ComponentType } from 'react'
import {
  AfterEffectsMark,
  CLangMark,
  Cinema4DMark,
  HunyuanMark,
  JimengMark,
  Max3dsMark,
  PhotoshopMark,
  PremiereProMark,
  SubstancePainterMark,
  UnrealEngineMark,
} from './skillMarks'

/** 方章内图标的形状：墨标不吃 props（尺寸交给 CSS），lucide 字形吃 size/strokeWidth。 */
export type IconShape = ComponentType<{ size?: number; strokeWidth?: number }>

/** Iconify 风格 id → 组件。换标＝改 site.yml 那个词；查不到就回落 circle。 */
const ICONS: Record<string, IconShape> = {
  'devicon-plain:photoshop': PhotoshopMark,
  'devicon-plain:aftereffects': AfterEffectsMark,
  'devicon-plain:premierepro': PremiereProMark,
  'devicon-plain:3dsmax': Max3dsMark,
  'simple-icons:cinema4d': Cinema4DMark,
  'simple-icons:unrealengine': UnrealEngineMark,
  'simple-icons:c': CLangMark,
  'thesvg:hunyuan': HunyuanMark,
  'thesvg:jimeng': JimengMark,
  'thesvg-color:substance-3d-painter': SubstancePainterMark,
  'lucide:brush': Brush,
  'lucide:message-square': MessageSquare,
}

/** 缺省图标：site.yml 未给 icon、或给了未登记的 id 时使用。 */
export const FALLBACK_ICON: IconShape = Circle

/**
 * 取图标组件。
 *
 * @param id site.yml 里写的 Iconify 风格 id；可缺省。
 * @returns 命中的组件；未登记或未给时回落 {@link FALLBACK_ICON}。
 */
export function skillIcon(id?: string): IconShape {
  return (id ? ICONS[id] : undefined) ?? FALLBACK_ICON
}