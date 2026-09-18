/* /about「观自」便当盒数据适配层（事实与话术同源 = site.yml about）。 */
import type { SiteData } from '../types/site'

export interface SkillGroup {
  id: string
  title: string
  /** 组一句话定位。 */
  desc: string
  tools: string[]
  /** 墨档英文码，挂 data-tier；色值唯一落点 = styles.css [data-tier]。 */
  tier: string
}

export interface GameExperience {
  name: string
  hours: number
  insight?: string
}

export interface CareerNode {
  period: string
  text: string
}

/** 「缺省即隐藏」守卫：可选事实各自是否有内容（组件据此决定整卡渲不渲染）。 */
export const hasLocation = (site: SiteData): boolean => (site.about.location ?? '').length > 0
export const hasGameLog = (site: SiteData): boolean => (site.about.gameLog ?? []).length > 0
export const hasTimeline = (site: SiteData): boolean => (site.about.timeline ?? []).length > 0

/** 技能卡「开启创造力」四组；唯一事实源 = site.yml about.skill_groups。 */
export function skillGroups(site: SiteData): SkillGroup[] {
  return (site.about.skill_groups ?? []).map((g) => ({ id: g.id, title: g.title, desc: g.desc, tools: g.tools, tier: g.tier }))
}

export const hasSkillGroups = (site: SiteData): boolean => (site.about.skill_groups ?? []).length > 0

/** 数据卡「游戏阅历与拆解」；唯一事实源 = site.yml about.gameLog。 */
export function gameExperiences(site: SiteData): GameExperience[] {
  return (site.about.gameLog ?? []).map((g) => ({ name: g.game, hours: g.hours, insight: g.insight }))
}

/** 生涯卡节点；唯一事实源 = site.yml about.timeline。 */
export function careerNodes(site: SiteData): CareerNode[] {
  return (site.about.timeline ?? []).map((t) => ({ period: t.period, text: t.text }))
}

/** 坐标卡配文；place_note 缺省时返回 null（组件据此不渲染该行）；{city} 填 about.location。 */
export function placeNote(site: SiteData): string | null {
  const tpl = site.about.place_note
  return tpl ? tpl.replace('{city}', site.about.location ?? '') : null
}
