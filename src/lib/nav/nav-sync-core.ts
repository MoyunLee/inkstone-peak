// 双导航纯决策层：由 items + URL + 视口模块 + 在场元素判定激活条目。
import type { NavLink, PresentSets } from '../types/nav'

export type { NavLink, PresentSets } from '../types/nav'

/** 取目标的路由基路径：去掉 `#` 后缀；空值回落 '/'（如 '/blog#x' → '/blog'）。 */
export const pathOf = (target: string): string => {
  const i = target.indexOf('#')
  return (i >= 0 ? target.slice(0, i) : target) || '/'
}
/** 取目标的 hash（含 `#`）；没有则返回空串。 */
export const hashOf = (target: string): string => {
  const i = target.indexOf('#')
  return i >= 0 ? '#' + target.slice(i + 1) : ''
}
/** '#home' 归一成空串（首页锚点不参与「在场」判定）；其余原样返回。 */
export const normHash = (h: string): string => (h === '#home' ? '' : h)

/**
 * 激活解析（纯函数）。优先级：① 滚动联动（spy ∈ main 域）② 详情页前缀固定 ③ 深链锚点在场
 * ④ 本页归属（非详情页 route 基路径 === pathname）；全部落空 → -1。
 *
 * @param items 导航条目，按 site.yml 的顺序给。
 * @param pathname 当前路径（已归一，不含 query/hash）。
 * @param hash 当前 hash（含 `#`）；无则空串。
 * @param spy 滚动联动算出的当前段 module id；无则空串。
 * @param present 在场集合——哪些 module 出现在 main 域 / 任意位置。
 * @returns 激活条目在 items 中的下标；无命中时返回 -1。
 * @example
 * const i = resolveActive(site.nav, pathname, hash, spy, present)
 */
export function resolveActive(items: readonly NavLink[], pathname: string, hash: string, spy: string, present: PresentSets): number {
  if (spy !== '' && present.main.has(spy)) {
    const i = items.findIndex((n) => n.module === spy)
    if (i >= 0) return i
  }
  const loc = pathname + hash
  for (let i = 0; i < items.length; i++) {
    const n = items[i]
    if (n !== undefined && n.isDetailPage && n.detailPrefix !== null && loc.startsWith(n.detailPrefix)) return i
  }
  if (hash !== '') {
    const i = items.findIndex((n) => n.module !== null && '#' + n.module === hash && present.any.has(n.module))
    if (i >= 0) return i
  }
  for (let i = 0; i < items.length; i++) {
    const n = items[i]
    if (n === undefined || n.isDetailPage) continue
    if (pathOf(n.route ?? '/') === pathname) return i
  }
  return -1
}
