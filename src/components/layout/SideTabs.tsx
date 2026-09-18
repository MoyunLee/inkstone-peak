import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { useSite } from '../../lib/data/site'
import { useNavState } from '../../lib/nav/nav-sync'
import type { NavLink } from '../../lib/types/site'

/**
 * 右侧题签（只有首页渲染）：朱点跟随激活项滑行，悬在激活字正上方（offsetTop - 12）。
 *
 * 非首页直接返回 null；点击优先滚到 `main > #module`，该落点不存在时退回常规导航跳转。
 *
 * @example
 * <SideTabs />
 */
export default function SideTabs() {
  const site = useSite()
  const { pathname } = useLocation()
  const { active, onClick } = useNavState(site.nav)
  const reduceMotion = useMotionSafe()
  const wrapRef = useRef<HTMLElement | null>(null)
  const [dotTop, setDotTop] = useState<number | null>(null)
  useEffect(() => {
    if (!wrapRef.current) return
    const remeasure = (): void => {
      if (wrapRef.current === null) return
      const el = active >= 0 ? wrapRef.current.querySelector<HTMLElement>(`a[data-nav="${active}"]`) : null
      setDotTop(el !== null ? el.offsetTop - 12 : null)
    }
    remeasure()
    // offsetTop 会因换行重排/字体迟到而变，须 resize + 字体就绪双通道重测（rAF 合帧，卸载后以 cancelled 兜）。
    let cancelled = false
    let raf = 0
    const schedule = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!cancelled) remeasure()
      })
    }
    window.addEventListener('resize', schedule)
    if (document.fonts) void document.fonts.ready.then(schedule)
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', schedule)
    }
  }, [active])
  const onTabClick = (n: NavLink): boolean => {
    const el = n.module !== null ? document.querySelector<HTMLElement>('main > #' + CSS.escape(n.module)) : null
    if (el !== null) {
      el.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
      return true
    }
    return onClick(n)
  }
  if (pathname !== '/') return null
  return (
    <nav className="side-tabs" ref={wrapRef} aria-label={site.a11y.tabs_label}>
      <i className="dot" style={dotTop !== null ? { top: dotTop } : { top: -99 }} aria-hidden="true" />
      {site.nav.map((n, i) => {
        const on = i === active
        return (
          <Link
            key={n.ink}
            data-nav={i}
            className={on ? 'on' : undefined}
            aria-current={on ? 'true' : undefined}
            to={n.route ?? '/'}
            onClick={(e) => {
              if (onTabClick(n)) e.preventDefault()
            }}
          >
            {n.ink}
          </Link>
        )
      })}
    </nav>
  )
}
