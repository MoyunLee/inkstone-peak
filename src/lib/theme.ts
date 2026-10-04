// 三态外观的真源：localStorage 只记「用户显式选择」，无记录即 'system'（跟随系统）。
// ⚠ 本模块顶层绝不碰 window / document：SSR（src/entry-server.tsx → routes.tsx → ThemeToggle）会 import 这条链。
// ⚠ 键名与取值口径同时住在 source/site/theme-init.js（防闪烁引导必须自持、不能 import TS），改一处必须两处一起改。

/** localStorage 键（唯一真源；theme-init.js 里的同名常量必须一致）。 */
export const THEME_KEY = 'inkstone-theme'

/** 三态：显式浅色 / 显式深色 / 跟随系统（默认，无记录即它）。 */
export type ThemePref = 'light' | 'dark' | 'system'

/** 落到 <html data-theme> 上的最终值：只可能是 light | dark（实现载体是属性，不是 class，也不动 body）。 */
export type ThemeName = 'light' | 'dark'

/** 两枚 media 版 theme-color 的纸底色（与 index.html 里那两枚 meta 同值）。 */
const PAPER_LIGHT = '#f7f4ee'
const PAPER_DARK = '#16181d'

/** 跟随系统用的媒体查询（与 theme-init.js、tokens.css 的深色媒体查询同一口径）。 */
const DARK_QUERY = '(prefers-color-scheme: dark)'

const isPref = (v: unknown): v is ThemePref => v === 'light' || v === 'dark' || v === 'system'

/**
 * 读用户显式选择。
 *
 * 无记录、取值非法、localStorage 抛错（隐私模式 / 被策略禁写）一律回落 'system'——
 * 引导脚本与运行时对同一种异常必须给出同一个答案，否则首帧与挂载后会对不上。
 *
 * @returns 显式选择；SSR（无 window）恒为 'system'。
 */
export function getPref(): ThemePref {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return isPref(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

/** 系统当前偏好；无 matchMedia（或 SSR）时按浅色。 */
export function systemTheme(): ThemeName {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * 把三态解析成最终 light|dark：显式项即本身，system 交给 matchMedia。
 *
 * @param pref 三态选择；缺省即读盘。
 * @example
 * getTheme('system')  // 系统深色时 'dark'
 */
export function getTheme(pref: ThemePref = getPref()): ThemeName {
  return pref === 'system' ? systemTheme() : pref
}

/** 写 <html>：data-theme + color-scheme（原生控件 / 滚动条 / <video> 控件跟着走）。 */
function paintTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.setAttribute('data-theme', theme)
  el.style.colorScheme = theme
}

/**
 * 同步 meta[name="theme-color"]。
 *
 * index.html 里两枚 meta 各带一支 media 查询（浅 / 深）——无 JS 时正好由浏览器按系统偏好挑一枚。
 * 显式选择时把**两枚都**改成所选纸底：media 仍各自生效，但取值一致，用户选的深色不会被浅色那枚盖掉。
 * system 态则必须把两枚各自还原成对应纸底，否则「先选深色、再切回跟随系统」之后 meta 会僵在深色。
 */
function paintMeta(pref: ThemePref): void {
  if (typeof document === 'undefined') return
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  for (let i = 0; i < metas.length; i += 1) {
    const meta = metas[i]
    if (!meta) continue
    const media = meta.getAttribute('media') ?? ''
    const dark = pref === 'system' ? (media ? media.includes('dark') : systemTheme() === 'dark') : pref === 'dark'
    meta.setAttribute('content', dark ? PAPER_DARK : PAPER_LIGHT)
  }
}

/**
 * 把 pref 生效到 DOM（data-theme / color-scheme / theme-color meta），返回最终主题。幂等。
 *
 * @param pref 三态选择；缺省即读盘。
 * @returns 最终生效的 light | dark。
 */
export function apply(pref: ThemePref = getPref()): ThemeName {
  const theme = getTheme(pref)
  paintTheme(theme)
  paintMeta(pref)
  return theme
}

/** 变化通知的载荷 = 新的选择与最终主题。 */
type Listener = (pref: ThemePref, theme: ThemeName) => void

const listeners = new Set<Listener>()
let installed = false

/** 落地并广播一次（apply 在前，订阅者拿到的 DOM 状态一定是最新的）。 */
function publish(pref: ThemePref): ThemeName {
  const theme = apply(pref)
  for (const fn of [...listeners]) fn(pref, theme)
  return theme
}

/** 系统主题变化：只在 system 态跟随（显式 light/dark 免疫系统变化）。 */
function onSystemChange(): void {
  if (getPref() === 'system') publish('system')
}

/** 另一个标签页改了选择（storage 事件只在**别的**文档里触发）：整份重读。 */
function onStorage(event: StorageEvent): void {
  if (event.key === null || event.key === THEME_KEY) publish(getPref())
}

/** 全局监听惰性安装一次（模块级单例；监听本身极小，不随订阅者增减拆装）。 */
function install(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  if (typeof window.matchMedia === 'function') window.matchMedia(DARK_QUERY).addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
}

/**
 * 订阅「选择变化 / 系统主题变化」；模块级单例，可重复订阅。
 *
 * 订阅时**不立即回调**（调用方自己先 apply 一次——useThemePref 正是这么做的），
 * 免得挂载期多一轮无谓的 setState。
 *
 * @param fn 变化回调（新的 pref 与最终 theme）。
 * @returns 退订函数。
 * @example
 * const off = subscribe((pref) => setPrefState(pref))
 * off()
 */
export function subscribe(fn: Listener): () => void {
  install()
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * 写显式选择：先落 localStorage（写不进去也继续，本次仍生效），再生效并通知所有订阅者。
 *
 * @param pref 用户点选的三态之一。
 * @returns 最终生效的 light | dark。
 */
export function setPref(pref: ThemePref): ThemeName {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_KEY, pref)
    } catch {
      /* 写不进去（隐私模式 / 被禁写）：本次仍按选择生效，只是刷新后回到系统态 */
    }
  }
  return publish(pref)
}
