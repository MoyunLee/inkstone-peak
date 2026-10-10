import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useSite } from '../../lib/data/site'
import { navBase } from '../../lib/meta/page-meta'
import { useNavState } from '../../lib/nav/nav-sync'
import type { NavLink } from '../../lib/types/site'
import Seal from '../ui/Seal'
import SealButton from '../ui/SealButton'

/**
 * 顶栏：站点徽章 + 主导航（一级项 + 分组下拉）+ 跳到正文的 skip-link。
 *
 * 条目与高亮全部由 site.yml 的 nav 驱动，导航状态与右侧题签（SideTabs）共用 useNavState；
 * `active` 是 **site.nav 全数组下标**，故一级项必须「先带原始下标、再过滤 parent === null」——
 * 先 filter 再 map 会把下标错位、高亮全乱。
 *
 * 分组（nav 里 parent === 本项基础路由的条目）收进下拉：触发器是**整条可点的一个按钮**
 * （文字 = 条目 ink，占位与开合两职合一），面板内列「父条目自身 + 各子项」（文字一律取 nav 的 ink），
 * 且一律由 SealButton 渲染成**横排墨框印章**（全站唯一墨框渲染，见 ui.css 首行）：
 * 面板里不再有裸 <Link>，尺寸只由 layout.css 覆盖一档紧凑值，渲染本体不复制。
 * 开合两条入口（其余关闭时机不变：Esc 收并把焦点送回触发器、点面板外收、点面板内某条收）：
 *   · **悬停**（仅 canHover() 为真的设备）：指针进 .nav-group 即展开、离开即收（留 120ms 宽限，见 onMouseLeave）。
 *     从触发器滑进面板不掉，靠的是把那道缝填进 .nav-group 命中区的悬浮桥
 *     （layout.css 的 .nav-group::after，与 ui.css 的 .theme-panel::after 同一套口径）：
 *     缝里本来没有任何元素，指针一进去就被判成"离开组件"，mouseleave 一到面板 display:none，
 *     鼠标再也追不回来（上一轮用户报的「鼠标离开就没有了」正是这个）。
 *   · **点击**：点触发器开合（触摸端唯一入口，键盘 Enter/Space 同路）。悬停已把面板带出来的那一次，
 *     首次点击只把这次展开"认领"下来、不收起——否则指针刚移到触发器上就被点没了，
 *     "点击打开"在任何设备上都读不出来；认领之后再点才收（hoverOnly 就是这个"是否已认领"）。
 *
 * ⚠ 面板容器**无条件渲染在 DOM 里**（可见性只由 data-open + CSS display 控制）：
 *   预渲染正文必须留着 /archive、/tags 的 <a>，爬虫与无 JS 用户才取得到（可达性回退）。
 *   也不许用 hidden 属性——预渲染闸（scripts/pre-render.ts）把正文里的 `<div hidden` 判成
 *   迟到 Suspense 标记并中止构建（同 ThemeToggle 的处置）。
 * ⚠ SSR/渲染期不得碰 matchMedia：canHover() 只在鼠标事件里调用，别把它（或任何设备能力嗅探）挪进渲染路径。
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
  /** 本次展开是否只是悬停带出来的（用户还没点过触发器）：点击据此决定"认领"还是"收起"。 */
  const hoverOnly = useRef(false)
  /** 离开 .nav-group 后的收起宽限：斜向扑向面板远端的印章时，指针会先划出组件、再落进面板，
   *  留 120ms 让落点先到（落进面板就是下一次 mouseenter，当场取消，见下方 onMouseEnter/onMouseLeave）。 */
  const closeTimer = useRef<number | null>(null)

  const triggerLabel = (ink: string): string => (site.a11y.nav_submenu_aria ?? 'nav_submenu_aria').replace('{ink}', ink)

  /** 真的能悬浮的设备才走悬停开合：触屏会把 tap 合成 mouseenter/mouseleave（同 ThemeToggle 的 canHover 口径）。 */
  const canHover = (): boolean => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  const cancelClose = (): void => {
    if (closeTimer.current === null) return
    window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  /** 收起：Esc / 点面板外 / 点面板内某条 共用，顺手清掉悬停标记与待收定时器。 */
  const closePanel = (): void => {
    cancelClose()
    hoverOnly.current = false
    setOpenKey(null)
  }

  // 卸载时清掉待收定时器（组件不常卸载，但别留一个会碰 setState 的悬挂回调）
  useEffect(() => () => cancelClose(), [])

  /** 面板内印章按钮的导航守卫：先收起面板，再复用顶栏链接**同一套**命中语义（命中 = 不跳转、回顶）。
   *  ⚠ 取向与 onClick 相反：onClick 返回 true 表示"已处理、调用方要 preventDefault"，
   *    而 SealButton 的 onNavGuard 返回 true 表示"放行"，故此处取反后再交回组件。 */
  const guardThenClose = (n: NavLink) => (): boolean => {
    closePanel()
    return !onClick(n)
  }

  // 点面板外即收起：判据是「落点不在当前打开的那个 .nav-group 里」。
  // 同时只允许开一个（openKey 单值），故无需逐组挂监听。
  useEffect(() => {
    if (openKey === null) return
    const onPointerDown = (event: PointerEvent): void => {
      const host = event.target instanceof Element ? event.target.closest('.nav-group') : null
      if (host === null || host.getAttribute('data-key') !== openKey) closePanel()
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
              onMouseEnter={() => {
                // 悬停展开（指针进触发器、进面板、进悬浮桥都会到这里：桥是 .nav-group 自己的伪元素）
                if (!canHover()) return
                cancelClose()
                if (!open) hoverOnly.current = true
                setOpenKey(n.ink)
              }}
              onMouseLeave={() => {
                // 悬停展开的一律"移开即收"，但留一个宽限期：指针从触发器斜着扑向面板远端的印章时，
                // 会先划出 .nav-group（触发器盒只有 40px 宽）再落进面板——落进面板当场取消这次收起。
                if (!canHover()) return
                cancelClose()
                closeTimer.current = window.setTimeout(() => {
                  closeTimer.current = null
                  closePanel()
                }, 120)
              }}
              onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                if (event.key !== 'Escape' || !open) return
                event.preventDefault()
                closePanel()
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
                  cancelClose()
                  // 悬停已经带出来的那次：这一点先"认领"（保持展开），不然指针刚移上来面板就被点没了；
                  // 认领过之后再点就是普通的开合（触摸端、键盘 Enter/Space 走的都是这条）。
                  if (open && !hoverOnly.current) {
                    closePanel()
                    return
                  }
                  hoverOnly.current = false
                  setOpenKey(n.ink)
                }}
              >
                {n.ink}
              </button>
              {/* 面板恒在 DOM：面板内印章按钮可 Tab 到（display:none 时不可聚焦，故不会「焦点在不可见元素上」）。
                  ★aria-current 落在包裹的 <span> 上：SealButton 不支持透传该属性（不改它的公共 API），
                    该 span 与按钮一一对应，故「当前页那一条」在可访问树里仍是一处、且只此一处。 */}
              <div className="nav-panel" id={id}>
                <span className="seal-item" aria-current={on ? 'true' : undefined}>
                  <SealButton to={n.route ?? '/'} chip="a" onNavGuard={guardThenClose(n)}>
                    {n.ink}
                  </SealButton>
                </span>
                {kids.map(({ n: c, i: ci }) => {
                  const con = ci === active
                  return (
                    <span key={c.ink} className="seal-item" aria-current={con ? 'true' : undefined}>
                      <SealButton to={c.route ?? '/'} chip="b" onNavGuard={guardThenClose(c)}>
                        {c.ink}
                      </SealButton>
                    </span>
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
