import { useEffect, useLayoutEffect } from 'react'

/**
 * 同构版 useLayoutEffect：SSR 环境退化为 useEffect，避免服务端渲染时 React 报
 * 「useLayoutEffect does nothing on the server」。
 *
 * 用途限定：需要在**首次绘制前**把状态从「服务端终态」拨到「动画起点」的场合。
 * 本站预渲染要求静态 HTML 直接是真值（无 JS / 爬虫 / 截图都看到满条满数），
 * 而进场动画又必须从 0 起——两者只能靠这个时序兼得。
 */
export const useIsoLayoutEffect: typeof useLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect