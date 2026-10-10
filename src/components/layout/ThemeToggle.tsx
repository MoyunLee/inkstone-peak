import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useSite } from '../../lib/data/site'
import { useThemePref } from '../../lib/hooks/useThemePref'
import type { ThemePref } from '../../lib/theme'

/** 三态顺序（方向键循环即按它）：浅色 → 深色 → 跟随系统。 */
const ORDER: readonly ThemePref[] = ['light', 'dark', 'system']

/** 每枚选项的图标（纯装饰；可访问名取 site.yml 的 a11y 文案）。 */
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

/**
 * 三态外观徽章（浅色 / 深色 / 跟随系统）——固定在视口左下角，悬浮即在徽章上方展开三枚选项。
 *
 * 语义是「三选一」不是开关，故用 role="radiogroup" + 三枚 role="radio" aria-checked。
 * 徽章本身是那枚「触发展开」的按钮（aria-haspopup/aria-expanded/aria-controls），图标＝当前模式。
 *
 * 展开的四条路径（都由状态驱动，故 aria-expanded 始终与所见一致）：
 *   指针进入徽章（仅 (hover:hover) 设备，避免触屏合成 mouseenter 造成闪开闪关）；
 *   键盘聚焦徽章；点按徽章（同时把焦点送进面板，方向键即可直接换）；Esc 只负责收起。
 * 收起：选完、焦点离开整块、指针移开（且焦点不在块内）、Esc、点块外。
 *
 * ⚠ 挂 #root 直下（routes.tsx），**不**留在 <header> 里：它是视口级控件。原先另有硬理由——
 *   顶栏当时带 backdrop-filter、会给 position:fixed 的后代当包含块，徽章会被钉在顶栏内而不是
 *   视口左下角；2026-10-11 顶栏把模糊挪到 ::before（见 styles/layout.css 的 .topbar），
 *   该约束已解除，"视口控件挂视口层"照旧。
 * ⚠ 面板容器**不许**用 hidden 属性：预渲染闸（scripts/pre-render.ts）把正文里的 `<div hidden`
 *   判成迟到 Suspense 标记并中止构建；这里用 data-open + CSS display 控制。
 * ⚠ SSR 期不得碰 matchMedia / localStorage：一律推迟到事件与副作用里。
 *
 * @example
 * <ThemeToggle />
 */
export default function ThemeToggle() {
  const site = useSite()
  const { pref, theme, setPref } = useThemePref()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const badgeRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const skipFocusOpen = useRef(false) // Esc/选完回焦徽章时，别被「聚焦即展开」again
  const wantFocus = useRef(false) // 只有明确确认（点按/键盘）才把焦点送进面板；悬浮不抢焦点
  const openSource = useRef<'pointer' | 'keyboard'>('keyboard') // 本次是谁展开的：指针（悬浮/点按）还是键盘
  const openedAt = useRef(0) // 本次展开的时刻：触屏是「focus 先展开、click 后到」，350ms 内的 click 视作同一次手势
  const panelId = useId()

  // 文案唯一家在 site.yml 的 a11y 段（组件内零中文字面量）；键缺失时回落键名，保证可访问名不为空
  const hint = site.a11y.theme_switch_hint ?? 'theme_switch_hint'
  const groupLabel = site.a11y.theme_label ?? 'theme_label'
  const labels: Record<ThemePref, string> = {
    light: site.a11y.theme_light ?? 'theme_light',
    dark: site.a11y.theme_dark ?? 'theme_dark',
    system: site.a11y.theme_system ?? 'theme_system',
  }

  /** 真的能悬浮的设备才走 hover 展开：触屏会把 tap 合成 mouseenter/mouseleave。 */
  const canHover = (): boolean => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  const focusChecked = (): void => {
    panelRef.current?.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')?.focus()
  }

  /** 收起并把焦点还给徽章（回焦前先挂上"抑制下次聚焦展开"，否则 onFocus 会立刻再展开）。 */
  const closeToBadge = (): void => {
    if (document.activeElement !== badgeRef.current) skipFocusOpen.current = true
    setOpen(false)
    badgeRef.current?.focus()
  }

  // 展开且这次是"明确确认"：把焦点送进当前选中项（悬浮展开不抢焦点）
  useEffect(() => {
    if (!open || !wantFocus.current) return
    wantFocus.current = false
    focusChecked()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /** 展开。记下来源（决定"指针移开要不要收"）与时刻（用来忽略触屏尾随的那次 click）。 */
  const openPanel = (focusInto: boolean, source: 'pointer' | 'keyboard'): void => {
    openSource.current = source
    openedAt.current = Date.now()
    if (focusInto) wantFocus.current = true
    setOpen(true)
  }

  /**
   * 点按／Enter／Space：
   * · 未展开 → 展开（鼠标点按记 'pointer'，Enter/Space 记 'keyboard'）；
   * · 已展开且是**同一次手势**尾随的 click（触屏 focus 先展开、click 后到）→ 只把焦点送进面板；
   * · 已展开且隔了 350ms 以上的再次点按 → 收起（点按徽章要能关得掉；否则触屏上只能靠点别处收）。
   */
  const onBadgeActivate = (detail: number): void => {
    const pointer = detail > 0
    if (open) {
      if (pointer) openSource.current = 'pointer'
      if (Date.now() - openedAt.current > 350) {
        closeToBadge()
        return
      }
      focusChecked()
      return
    }
    openPanel(true, pointer ? 'pointer' : 'keyboard')
  }

  /** radiogroup 惯例：方向键移动焦点并选中（循环）；Space/Enter 确认后收起回徽章。Esc 由外层统一收。 */
  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const current = (event.target as HTMLElement).dataset.value
    const index = Math.max(0, ORDER.indexOf(current as ThemePref))
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (step !== 0) {
      event.preventDefault()
      const next = ORDER[(index + step + ORDER.length) % ORDER.length] ?? 'system'
      setPref(next)
      panelRef.current?.querySelector<HTMLButtonElement>('[role="radio"][data-value="' + next + '"]')?.focus()
      return
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      setPref((current ?? pref) as ThemePref)
      closeToBadge()
    }
  }

  const Icon = ICONS[pref]

  return (
    <div
      className="theme-switch"
      ref={wrapRef}
      data-open={open ? 'true' : 'false'}
      data-pref={pref}
      data-active-theme={theme}
      onMouseEnter={() => {
        if (canHover() && !open) openPanel(false, 'pointer')
      }}
      onMouseLeave={() => {
        // 指针展开的（悬浮或点按）：移开即收，**不管焦点在哪**——点按后焦点落在面板里，
        // 若按"焦点还在块内就不收"来判，鼠标移开后面板会一直挂着（用户实测反馈）。
        // 键盘展开的不收：那会把用户正在操作的元素藏起来（键盘路径本来也触发不了 mouseleave）。
        if (canHover() && openSource.current === 'pointer') setOpen(false)
      }}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          closeToBadge()
        }
      }}
    >
      <button
        ref={badgeRef}
        type="button"
        className="theme-badge"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        data-pref={pref}
        aria-label={hint}
        title={hint}
        onFocus={() => {
          if (skipFocusOpen.current) {
            skipFocusOpen.current = false
            return
          }
          // 点击会先 focus 再 click：这里先按键盘来记，随后的 click（detail>0）会把来源补正成 pointer
          if (!open) openPanel(false, 'keyboard')
        }}
        onClick={(event) => onBadgeActivate(event.detail)}
      >
        <Icon aria-hidden="true" size={20} />
      </button>
      <div
        ref={panelRef}
        id={panelId}
        className="theme-panel"
        role="radiogroup"
        aria-label={groupLabel}
        onKeyDown={onPanelKeyDown}
      >
        {ORDER.map((value) => {
          const ChoiceIcon = ICONS[value]
          const checked = pref === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-pref={value}
              data-value={value}
              className="theme-choice"
              aria-label={labels[value]}
              title={labels[value]}
              onClick={() => {
                setPref(value)
                closeToBadge()
              }}
            >
              <ChoiceIcon aria-hidden="true" size={18} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
