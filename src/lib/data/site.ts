// 站点骨架话术的只读源：.content/site.json 由 scripts/content 构建期生成，运行时零 fetch。
import siteJson from '../../../.content/site.json'
import type { HomeSection, SiteData } from '../types/site'

export type { SiteData, HomeSection } from '../types/site'

// a11y 整节可缺省：归一成空表，组件侧无需 ?.a11y。
const SITE: SiteData = { ...(siteJson as unknown as SiteData), a11y: (siteJson as unknown as SiteData).a11y ?? {} }

/**
 * 取站点骨架数据（话术 / 导航 / 页脚 / a11y）——构建期已由 scripts/content 从 site.yml 生成。
 *
 * 同步返回、零网络请求；`a11y` 已归一成空表，调用方不必写 `?.a11y`。
 *
 * @returns 整份 SiteData（只读常量，引用稳定）。
 * @example
 * const site = useSite()
 * <h1>{site.site.title}</h1>
 */
export function useSite(): SiteData {
  return SITE
}

/**
 * 按段 id 取首页段配置（页脚等组件靠它复用首页标题/英文副题，避免同一句话两处写）。
 *
 * @param s useSite() 返回的站点数据。
 * @param id 目标段 id，见 site.yml 的 home.sections[].id。
 * @returns 命中的段；该 id 不存在时返回 undefined。
 * @example
 * const sec = sectionById(site, 'footer')
 * sec?.heading
 */
export function sectionById(s: SiteData, id: string): HomeSection | undefined {
  return s.home.sections.find((x) => x.id === id)
}

