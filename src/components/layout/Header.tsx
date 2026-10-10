import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useSite } from '../../lib/data/site'
import { navBase } from '../../lib/meta/page-meta'
import { useNavState } from '../../lib/nav/nav-sync'
import type { NavLink } from '../../lib/types/site'
import Seal from '../ui/Seal'

/**
 * 顶栏：站点徽章 + 主导航（一级项 + 分组下拉）+ 跳到正文的 skip-link。
 *
 * 条目与高亮全部由 site.yml 的 nav 驱动，导航状态与右侧题签（SideTabs）共用 useNavState；
 * `active` 是 **site.nav 全数组下标**，故一级项必须「先带原始下标、再过滤 parent === null」——
 * 先 filter 再 map 会把下标错位、高亮全乱。
 *
 * 分组（nav 里 parent === 本项基础路由的条目）收进下拉：触发器是**整条可点的一个按钮**
 * （文字 = 条目 ink，占位与开合两职合一），面板内列「父条目自身 + 各子项」（文字一律取 nav 的 ink）。
 * 开合只认点击：再点触发器收、Esc 收（焦点送回触发器）、点面板外收；**指针移开一律不收**——
 * 早先的 hover 展开已整个撤掉（指针从触发器滑向面板要穿过 4px 缝隙，一进缝里就收起，
 * 面板 display:none 后鼠标再也追不回来，用户报「鼠标离开就没有了」）。勿以任何形式恢复。
 *
 * ⚠ 面板容器**无条件渲染在 DOM 里**（可见性只由 data-open + CSS display 控制）：
 *   预渲染正文必须留着 /archive、/tags 的 <a>，爬虫与无 JS 用户才取得到（可达性回退）。
 *   也不许用 hidden 属性——预渲染闸（scripts/pre-render.ts）把正文里的 `<div hidden` 判成
 *   迟到 Suspense 标记并中止构建（同 ThemeToggle 的处置）。
 * ⚠ SSR/渲染期不得碰 matchMedia：这里已无 hover 判定，仍别把任何设备能力嗅探放回渲染路径。
 *
 * @example
 * <Header />
 */
export default function Header() {
  const site = useSite()
  const { active, onClick } = useNavState(site.nav)
  const panelId = useId()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const triggerLabel = (ink: string): string => (site.a11y.nav_submenu_aria ?? 'nav_submenu_aria').replace('{ink}', ink)

  /** 面板内链接：先走与顶栏链接**同一套**命中语义（命中 = 不跳转、回顶），再收起面板。 */
  const navThenClose = (n: NavLink) => (event: ReactMouseEvent<HTMLAnchorElement>): void => {
    if (onClick(n)) event.preventDefault()
    setOpenKey(null)
  }

  // 点面板外即收起：判据是「落点不在当前打开的那个 .nav-group 里」。
  // 同时只允许开一个（openKey 单值），故无需逐组挂监听。
  useEffect(() => {
    if (openKey === null) return
    const onPointerDown = (event: PointerEvent): void => {
      const host = event.target instanceof Element ? event.target.closest('.nav-group') : null
      if (host === null || host.getAttribute('data-key') !== openKey) setOpenKey(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openKey])

  // 先带原始下标、再按 parent 过滤：on = i === active 用的仍是 site.nav 的全数组下标。
  const items: { n: NavLink; i: number }[] = site.nav.map((n, i) => ({ n, i }))
  const tops = items.filter(({ n }) => n.parent === null)
  const childrenOf = (route: string | null): { n: NavLink; i: number }[] =>
    items.filter(({ n }) => n.parent !== null && n.parent === navBase(route))

  return (
    <header className="topbar">
      {site.a11y.skip_link_label ? (
        <a className="skip-link" href="#main-content">
          {site.a11y.skip_link_label}
        </a>
      ) : null}
      <div className="brand-wrap">
        <Link to="/" className="brand" aria-label={site.a11y.brand_label} title={site.site.title}>
          <Seal variant="badge" />
        </Link>
      </div>
      <nav aria-label={site.a11y.nav_label}>
        {tops.map(({ n, i }) => {
          const on = i === active
          const kids = childrenOf(n.route)
          // 分组「包含当前页」：当前页落在面板里（子项任一命中 active）。
          // 此时触发器本身不是当前页，不能冒充 aria-current，改用 data-active 表达父级标记。
          const holdsActive = kids.some(({ i: ki }) => ki === active)
          const open = openKey === n.ink
          const link = (
            <Link
              key={n.ink}
              className={on ? 'on' : undefined}
              aria-current={on ? 'true' : undefined}
              to={n.route ?? { pathname: '/', hash: '#home' }}
              onClick={(e) => {
                if (onClick(n)) e.preventDefault()
              }}
            >
              {n.ink}
            </Link>
          )
          if (kids.length === 0) return link
          const id = panelId + '-' + i
          return (
            <div
              key={n.ink}
              className="nav-group"
              data-key={n.ink}
              data-active={holdsActive ? 'true' : undefined}
              data-open={open ? 'true' : 'false'}
              onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                if (event.key !== 'Escape' || !open) return
                event.preventDefault()
                setOpenKey(null)
                triggerRefs.current[n.ink]?.focus() // Esc 收起并把焦点送回触发器
              }}
            >
              {/* 整条「观山」即触发器：占位与开合两职合一（可访问名仍取 a11y 键），视觉与旁边三条平级链接无差别 */}
              <button
                ref={(el) => {
                  triggerRefs.current[n.ink] = el
                }}
                type="button"
                className="nav-trigger"
                data-current={on ? 'true' : undefined}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={id}
                aria-label={triggerLabel(n.ink)}
                title={triggerLabel(n.ink)}
                onClick={() => {
                  setOpenKey(open ? null : n.ink)
                }}
              >
                {n.ink}
              </button>
              {/* 面板恒在 DOM：面板内链接可 Tab 到（display:none 时不可聚焦，故不会「焦点在不可见元素上」） */}
              <div className="nav-panel" id={id}>
                <Link
                  key={n.ink}
                  className={on ? 'on' : undefined}
                  aria-current={on ? 'true' : undefined}
                  to={n.route ?? '/'}
                  onClick={navThenClose(n)}
                >
                  {n.ink}
                </Link>
                {kids.map(({ n: c, i: ci }) => {
                  const con = ci === active
                  return (
                    <Link
                      key={c.ink}
                      className={con ? 'on' : undefined}
                      aria-current={con ? 'true' : undefined}
                      to={c.route ?? '/'}
                      onClick={navThenClose(c)}
                    >
                      {c.ink}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </header>
  )
}
