import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { sectionById, useSite } from '../../lib/data/site'
import { useNavState } from '../../lib/nav/nav-sync'
import type { NavLink } from '../../lib/types/site'

/**
 * 右侧题签（只有首页渲染）：朱点跟随激活项滑行，悬在激活字正上方（offsetTop - 12）。
 *
 * 非首页直接返回 null；点击优先滚到 `main > #module`，该落点不存在时退回常规导航跳转。
 * 第五条「直达脚页」（site.yml 的 footer.tab_label）不并进 useNavState 的 items，故不参与那套滚动联动；
 * 它自己量一条中线（见下），滑到底部时由它接管高亮与朱点。
 *
 * @example
 * <SideTabs />
 */
export default function SideTabs() {
  const site = useSite()
  const { pathname } = useLocation()
  const { active, onClick } = useNavState(site.nav)
  const reduceMotion = useMotionSafe()
  // 第五条题签「传音 · 直达脚页」：题签名住 site.yml footer.tab_label，
  // 落点 = home.sections 里 footer 段的 id（不写死字符串，段改名/移位照样命中）。
  // ★不并进 useNavState 的 items：那份状态是模块级单例、被顶栏共用；塞进去既会多起一套观察器
  //   （数组每次渲染都是新引用 → effect 反复重建），也会把 active 的下标体系搅乱。
  //   它只是一条直达捷径，点击复用 onClick —— 落点已在本页，走的是「平滑滚到该 #锚」那条律。
  const footSec = sectionById(site, 'footer')
  const footTab: NavLink | null =
    footSec && site.footer.tab_label
      ? { ink: site.footer.tab_label, route: `/#${footSec.id}`, isDetailPage: false, detailPrefix: null, module: footSec.id, parent: null }
      : null
  // 传音的点亮（滑到最低部时必须点亮：有朱标、也加粗）：
  // 判据取两条、取或 ——
  //   ① 脚页段越过视口中线：与滚动监听同构（spy 的 -45%/-45% 就是中线上下各 5% 的窄带），
  //      于是「观自交班 → 传音接管」是同一拍，不会两条同时亮、也不会空档；
  //   ② 已到文档最底：视口比脚页高得多时（脚页高约 650~780px，随视口略变，故不写死阈值；两倍以上
  //      就会出现）滚到底，脚页的顶仍在中线之下，只认①会让「滑到最低部」这条路在大窗口/竖屏上
  //      永不点亮 —— 故再兜一条硬底。
  const footId = footTab?.module ?? ''
  const [atFoot, setAtFoot] = useState(false)
  useEffect(() => {
    if (pathname !== '/' || footId === '') return
    const el = document.getElementById(footId)
    if (el === null) return
    let raf = 0
    const measure = (): void => {
      raf = 0
      const r = el.getBoundingClientRect()
      const mid = window.innerHeight / 2
      // 容 4px：缩放/分数 DPR 下 scrollY + innerHeight 会差一两像素，不该因此判「还没到底」
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
      setAtFoot((r.top <= mid && r.bottom >= mid) || atBottom)
    }
    // 滚动只做 rAF 合帧，读的是 getBoundingClientRect（不碰 scrollTop/offsetTop 那套会强制同步布局的口径）
    const schedule = (): void => {
      if (raf === 0) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [pathname, footId])
  const wrapRef = useRef<HTMLElement | null>(null)
  const [dotTop, setDotTop] = useState<number | null>(null)
  useEffect(() => {
    if (!wrapRef.current) return
    const remeasure = (): void => {
      if (wrapRef.current === null) return
      const key = atFoot && footId !== '' ? 'footer' : String(active)
      const el = wrapRef.current.querySelector<HTMLElement>(`a[data-nav="${key}"]`)
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
  }, [active, atFoot, footId])
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
      {/* 题签是首页滚动联动的段导航：只留挂了 module 的条目（parent 组里的 归档/标签 不在此列）。
          先带原始下标、再过滤 module：data-nav 与 active 都必须是 site.nav 的**全数组下标**，
          先 filter 再 map 会让两者脱节、dotTop 落 -999。 */}
      {site.nav
        .map((n, i) => ({ n, i }))
        .filter(({ n }) => n.module !== null)
        .map(({ n, i }) => {
          const on = !atFoot && i === active
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
      {footTab !== null ? (
        <Link
          to={footTab.route ?? '/'}
          data-nav="footer"
          className={atFoot ? 'on' : undefined}
          aria-current={atFoot ? 'true' : undefined}
          onClick={(e) => {
            if (onTabClick(footTab)) e.preventDefault()
          }}
        >
          {footTab.ink}
        </Link>
      ) : null}
    </nav>
  )
}
