/* /about「观自」便当盒数据适配层（事实与话术同源 = site.yml about）。 */
import type { SiteData } from '../types/site'

/** 技能卡里的单个技能：档位号与经验值同源（同档由构建期硬校验，运行时不再判断）。 */
export interface Skill {
  name: string
  /** 档位号 1-N（N = site.yml about.skill_levels 的档数）。 */
  level: number
  /** 当前经验值 0-expMax。 */
  exp: number
}

/** 技能等级档：name=卡面等级名（中文唯一家 = site.yml），max=本档经验值上界。 */
export interface SkillLevel {
  name: string
  max: number
}

export interface CareerNode {
  period: string
  text: string
}

/** 「缺省即隐藏」守卫：可选事实各自是否有内容（组件据此决定整卡渲不渲染）。 */
export const hasLocation = (site: SiteData): boolean => (site.about.location ?? '').length > 0
export const hasTimeline = (site: SiteData): boolean => (site.about.timeline ?? []).length > 0

/** 技能等级体系；唯一事实源 = site.yml about.skill_levels。 */
export function skillLevels(site: SiteData): SkillLevel[] {
  return (site.about.skill_levels ?? []).map((l) => ({ name: l.name, max: l.max }))
}

/**
 * 经验值满分 = 等级体系末档的 max（推导而来，全站勿再写第二个 1000）。
 *
 * @returns 满分经验值；未配等级体系时 0（调用方由 hasSkills 先行拦截）。
 */
export function skillExpMax(site: SiteData): number {
  const ls = site.about.skill_levels ?? []
  return ls[ls.length - 1]?.max ?? 0
}

/** 技能卡平铺技能表；唯一事实源 = site.yml about.skills（数组顺序即渲染顺序）。 */
export function skills(site: SiteData): Skill[] {
  return (site.about.skills ?? []).map((s) => ({ name: s.name, level: s.level, exp: s.exp }))
}

/**
 * 档位号取等级名（1 基）。
 *
 * @param levels skillLevels() 返回的等级表。
 * @param level 档位号，1 起。
 * @returns 命中的等级名；越界返回空串（构建期已挡，这里只做不抛的兜底）。
 */
export function skillLevelName(levels: SkillLevel[], level: number): string {
  return levels[level - 1]?.name ?? ''
}

/** 技能卡整卡是否可渲染：既要有技能条目，也要有等级体系（等级名与满分都由它派生）。 */
export const hasSkills = (site: SiteData): boolean =>
  (site.about.skills ?? []).length > 0 && (site.about.skill_levels ?? []).length > 0

/** 生涯卡节点；唯一事实源 = site.yml about.timeline。 */
export function careerNodes(site: SiteData): CareerNode[] {
  return (site.about.timeline ?? []).map((t) => ({ period: t.period, text: t.text }))
}

/** 坐标卡配文；place_note 缺省时返回 null（组件据此不渲染该行）；{city} 填 about.location。 */
export function placeNote(site: SiteData): string | null {
  const tpl = site.about.place_note
  return tpl ? tpl.replace('{city}', site.about.location ?? '') : null
}