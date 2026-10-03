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

/**
 * 按段 id（= nav 条目的 module）取该页在导航里的名字（`ink`）——页面唯一 `h1` 就用它。
 *
 * 为什么用这个而不用段标题：`/about` 的 h1 本来就是这枚词（「观自」= nav ink = `about.hero_title`）；
 * 段标题（「观自 · 吾身技艺」/「观山 · 作品全览」）是**更长的题头**，两回事。
 * 取它还能顺带保证 h1 与「顶栏那枚词 / 面包屑 / JSON-LD」说的是同一个名字，且不会与传音页
 * 自己渲染的可见题头（h2）重复念一遍。
 *
 * @param s useSite() 返回的站点数据。
 * @param module nav 条目的 `module`（= 首页段 id）。
 * @returns 命中的 `ink`；没有对应 nav 条目时返回 undefined（调用方据此不渲染 h1）。
 * @example
 * const ink = navInk(site, 'portfolio')   // '观山'
 */
export function navInk(s: SiteData, module: string): string | undefined {
  return s.nav.find((n) => n.module === module)?.ink
}

