/* 导航共用锁表：顶栏直跳、各段 CTA、题签滚动共用同一张表。 */
const DEBOUNCE = 250
const NAV_LOCK = 800
const lastAt = new Map<string, number>()
const busy = new Set<string>()

/**
 * 导航跳转三件套之一：判断本次点击是否该被吞掉（同一 key 在 250ms 内重复触发算连击）。
 *
 * 标准用法是 `swallow → stamp → lockNav` 顺序配合：先问该不该吞；没吞则盖时间戳并加 800ms 跳页锁。
 *
 * @param key 行为标识；同一入口必须复用同一个 key（例如 `detail:footer`）。
 * @returns true = 本次点击应被吞掉（调用方自行 preventDefault）。
 * @example
 * if (swallow(key)) return false
 * stamp(key)
 * lockNav(key)
 * return true
 */
export function swallow(key: string): boolean {
  return busy.has(key) || performance.now() - (lastAt.get(key) ?? 0) < DEBOUNCE
}
/** 记下该 key 的最近触发时间，供 swallow 做 250ms 去抖。 */
export function stamp(key: string): void {
  lastAt.set(key, performance.now())
}
/** 给该 key 加 800ms 跳页锁；锁内 swallow 恒为 true，防连点重复跳转。 */
export function lockNav(key: string): void {
  busy.add(key)
  setTimeout(() => busy.delete(key), NAV_LOCK)
}
/** 路由变更即清跳页锁（250ms 连击吞保留）。 */
export function unlockAllNav(): void {
  busy.clear()
}

// ── 用户主动行为闸：加载/滚动恢复/懒段撑高期间的视口位移不许改写 URL，只由真实用户行为解禁；每个页面视图重置一次。
let acted = false
export function markActed(): void {
  acted = true
}
export function hasActed(): boolean {
  return acted
}
export function resetActed(): void {
  acted = false
}
