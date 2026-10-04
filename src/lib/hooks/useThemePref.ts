import { useLayoutEffect, useState } from 'react'
import { apply, getPref, setPref as writePref, subscribe } from '../theme'
import type { ThemeName, ThemePref } from '../theme'

/** useThemePref 的返回值。 */
export interface ThemeState {
  /** 用户显式选择（'system' = 跟随系统）。 */
  pref: ThemePref
  /** 当前实际生效的主题（system 态即系统当前值）。 */
  theme: ThemeName
  /** 写入显式选择并立刻生效（无需刷新）。 */
  setPref: (pref: ThemePref) => void
}

/**
 * 订阅三态外观，并在挂载时把偏好落地到 <html>。
 *
 * 首渲染恒为 { pref: 'system', theme: 'light' }——这正是构建期预渲染标记里的那一份
 * （SSR 读不到 localStorage），于是 #prerender 与 React 首屏逐字节一致，加载瞬间不会有选择态跳变。
 * 真实偏好由 useLayoutEffect 在**提交后、浏览器绘制前**读盘同步；这里刻意不用 useEffect：
 * 那要等首帧画完才补，眼睛能看见那一下。
 *
 * 落地（data-theme / color-scheme / theme-color meta）一律由 src/lib/theme.ts 的 apply 完成，
 * 组件侧不自己碰 documentElement。
 *
 * @returns 三态选择、最终主题与写入口。
 * @example
 * const { pref, setPref } = useThemePref()
 */
export function useThemePref(): ThemeState {
  const [state, setState] = useState<{ pref: ThemePref; theme: ThemeName }>({ pref: 'system', theme: 'light' })

  useLayoutEffect(() => {
    const sync = (pref: ThemePref, theme: ThemeName): void => {
      setState((prev) => (prev.pref === pref && prev.theme === theme ? prev : { pref, theme }))
    }
    // 先读盘落地（必须在这一帧绘制前完成），再订阅后续变化
    const pref = getPref()
    sync(pref, apply(pref))
    // StrictMode 双挂载 = 退订再订，幂等；退订不动模块级全局监听
    return subscribe(sync)
  }, [])

  return { ...state, setPref: writePref }
}
