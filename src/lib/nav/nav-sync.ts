// 双导航（Header + SideTabs）共享状态源；配置唯一权威 = site.yml nav[]。
import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { hasActed, lockNav, markActed, resetActed, stamp, swallow } from './navlock'
import { useMotionSafe } from '../hooks/useMotionSafe'
import { hashOf, normHash, pathOf, resolveActive } from './nav-sync-core'
import type { NavLink } from '../types/site'
import type { PresentSets } from './nav-sync-core'

export { pathOf, hashOf, normHash, resolveActive }
export type { PresentSets }

let spyModule = ''
const listeners = new Set<() => void>()
function emit(): void {
  for (const l of Array.from(listeners)) l()
}
function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const getSnapshot = (): string => spyModule
const getServerSnapshot = (): string => ''

export interface NavState {
  active: number
  /** true=已处理（调用方 preventDefault），false=放行 Link 跳转 */
  onClick: (n: NavLink) => boolean
}

/** 渲染期采集在场段：main> 与任意两种域各一份（语义见 PresentSets）。 */
function collectPresent(items: readonly NavLink[]): PresentSets {
  // 构建期 SSR 无 DOM：给空集——首屏高亮本就由 resolveActive 的 path 级规则决定，spy 未启动时口径一致。
  if (typeof document === 'undefined') return { main: new Set<string>(), any: new Set<string>() }
  const main = new Set<string>()
  const any = new Set<string>()
  for (const n of items) {
    if (n.module === null) continue
    if (document.getElementById(n.module) === null) continue
    any.add(n.module)
    if (document.querySelector('main > #' + CSS.escape(n.module)) !== null) main.add(n.module)
  }
  return { main, any }
}

/**
 * 双导航（顶栏 + 侧栏）共享的状态源：给出当前激活项与点击拦截函数。
 *
 * 内部是一条滚动监听引擎（IntersectionObserver + MutationObserver），遵守三条不变量：
 * ① 加载期不改写 URL，只由真实用户行为解禁；② `main >` 作用域让详情页天然免疫首页段联动；
 * ③ 点击律只吞「已在本页」的点击：详情页条目（isDetailPage）以**落在它自己的列表页**为判据，
 *    故 /portfolio/<slug> 里点「观山」是回列表，不是一次被吞掉的空点击。
 * 同一页面只能调用一次——状态是模块级单例（spyModule + 订阅表）。
 *
 * @param items 导航条目，按 site.yml 的 nav 顺序给（Header / SideTabs 都传 useSite().nav）。
 * @returns active = 激活项下标（无命中为 -1）；onClick = 点击拦截，返回 true 表示已处理，调用方需 preventDefault。
 * @example
 * const { active, onClick } = useNavState(site.nav)
 * <Link to={n.route} onClick={(e) => { if (onClick(n)) e.preventDefault() }} />
 */
export function useNavState(items: NavLink[]): NavState {
  const location = useLocation()
  const hash = normHash(location.hash)
  const reduceMotion = useMotionSafe()
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

  // ── 滚动监听引擎：候选=nav 声明 module 且 main>#module 在场的段；main> 作用域即详情页免疫守卫。
  useEffect(() => {
    spyModule = ''
    emit()
    resetActed()
    const onUserAct = (): void => markActed()
    const USER_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'click'] as const
    for (const ev of USER_EVENTS) window.addEventListener(ev, onUserAct, { capture: true, passive: true })
    const wanted = new Set<string>()
    for (const n of items) if (n.module !== null) wanted.add(n.module)
    if (wanted.size === 0) return
    let io: IntersectionObserver | null = null
    const attached = new Set<string>()
    const tryAttach = (): void => {
      for (const m of Array.from(wanted)) {
        if (attached.has(m)) continue
        const el = document.querySelector<HTMLElement>('main > #' + CSS.escape(m))
        if (el === null) continue
        attached.add(m)
        io?.observe(el)
      }
      if (attached.size >= wanted.size) {
        mo.disconnect()
        maybeUnlock() // 候选段全量挂上 = 解锁的另一半条件
      }
    }
    // ── F5/加载期保护：加载期（滚动恢复/懒段撑高/锚点晚到）任何 URL 改写一律禁行，只由真实用户行为解禁。
    const want = decodeURIComponent(window.location.hash.replace(/^#/, '')).replace(/^home$/, '')
    const wantIsModule = want !== '' && wanted.has(want)
    const ATTACH_GRACE = 1600
    const URL_SETTLE_MS = 200
    let urlLocked = true
    let timeOk = false
    let unlockTimer = 0
    let deadlineTimer = 0
    let urlWriteTimer = 0
    // 「首页段」的模块 id 从 nav 推（route 为 '/' 的那条），不再写死 'home'
    const homeModule = items.find((n) => pathOf(n.route ?? '/') === '/')?.module ?? 'home'
    const canWriteUrl = (id: string): boolean => {
      if (urlLocked) return false
      if (!hasActed()) return false // 加载期零改写：URL 只随真实用户行为变化
      if (window.location.pathname !== location.pathname) return false // pathname 已变，本引擎写入作废
      if (wantIsModule && !attached.has(want)) return false // 目标段未在场=DOM 不完整，禁改写
      const owner = items.find((n) => n.module === id)
      return owner !== undefined && (location.pathname === '/' || hashOf(owner.route ?? '/') === '#' + id)
    }
    const commitUrl = (id: string): void => {
      if (canWriteUrl(id)) window.history.replaceState(null, '', id === homeModule ? window.location.pathname : '#' + id)
    }
    // URL 改写只认滚动落定值：去抖 200ms 合并穿越，只提交最终段；高亮（emit）仍即时。
    const scheduleUrlWrite = (id: string): void => {
      window.clearTimeout(urlWriteTimer)
      urlWriteTimer = window.setTimeout(() => commitUrl(id), URL_SETTLE_MS)
    }
    const writeSpy = (): void => {
      if (spyModule === '') return
      scheduleUrlWrite(spyModule)
    }
    const finishUnlock = (): void => {
      urlLocked = false
      if (wantIsModule) {
        const el = document.getElementById(want)
        if (el !== null) {
          const r = el.getBoundingClientRect()
          const mid = window.innerHeight / 2
          if (r.top > mid || r.bottom < mid) el.scrollIntoView({ block: 'start', behavior: 'instant' })
        }
      }
      if (!wantIsModule || spyModule === want) writeSpy() // 补写视口段；spy 滞后时让位 IO 首拍
    }
    const maybeUnlock = (): void => {
      if (urlLocked && timeOk && attached.size >= wanted.size) finishUnlock()
    }
    io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue
          const id = e.target.id
          if (id === spyModule) continue
          spyModule = id
          emit()
          if (urlLocked) continue // 加载锁期只改高亮不写 URL
          scheduleUrlWrite(id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    const mo = new MutationObserver(tryAttach)
    mo.observe(document.body, { childList: true, subtree: true })
    tryAttach()
    const armUnlock = (): void => {
      unlockTimer = window.setTimeout(() => {
        timeOk = true
        maybeUnlock()
        if (urlLocked) deadlineTimer = window.setTimeout(finishUnlock, ATTACH_GRACE) // 未在场：宽限后强制解锁
      }, 400)
    }
    if (document.readyState === 'complete') armUnlock()
    else window.addEventListener('load', armUnlock, { once: true })
    return () => {
      io?.disconnect()
      mo.disconnect()
      window.clearTimeout(unlockTimer)
      window.clearTimeout(deadlineTimer)
      window.clearTimeout(urlWriteTimer) // 换页即弃未落定的去抖写
      window.removeEventListener('load', armUnlock) // 卸载后 load 迟到不再装计时器
      for (const ev of USER_EVENTS) window.removeEventListener(ev, onUserAct, { capture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, items])

  const spy = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const active = resolveActive(items, location.pathname, hash, spy, collectPresent(items))

  const onClick = (n: NavLink): boolean => {
    const route = n.route ?? '/'
    const key = 'nav:' + n.ink
    if (swallow(key)) return true // 250ms 连击一律吞
    if (n.isDetailPage) {
      // 「已在本页」的判据 = **落在该导航自己的落地页上**（如 /portfolio），不是前缀命中：
      // 前缀命中把详情页（/portfolio/<slug>）也算进来，于是详情页里点「观山」被吞成一次
      // 什么都不做的点击（用户读到的是「导航点不动」）。详情页该做的是回列表。
      if (location.pathname === pathOf(route)) {
        stamp(key)
        window.scrollTo({ top: 0, behavior }) // 已在列表页 → 平滑回顶
        return true
      }
      stamp(key)
      lockNav(key)
      return false
    }
    if (pathOf(route) === location.pathname) {
      stamp(key)
      const f = hashOf(route)
      const el = f !== '' ? document.getElementById(f.slice(1)) : null
      if (el !== null) el.scrollIntoView({ block: 'start', behavior })
      else window.scrollTo({ top: 0, behavior }) // 无 # 锚 → 整页回顶
      return true
    }
    stamp(key)
    lockNav(key)
    return false
  }

  return { active, onClick }
}
