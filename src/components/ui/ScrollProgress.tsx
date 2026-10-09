import { useEffect, useRef } from 'react'

/**
 * 顶部阅读进度：固定在下缘的 2px 细线，随文档滚动比例 scaleX(0→1)。
 *
 * 驱动分两条互斥的路（2026-10-09 收成一处实现——原先只有首页内联了一份）：
 *  · 支持 animation-timeline 的浏览器走 CSS 滚动时间线（合成线程，零 JS，见 responsive.css）；
 *  · 不支持的走本组件的被动 scroll 监听 + rAF 合并。
 *    ★刻意**不用**常驻 rAF 循环：那样每帧都要读一次 scrollHeight，页面静止时也在烧 CPU；
 *      滚动事件驱动则静止时零开销，且 rAF 合并把一帧内的多次滚动压成一次写入。
 * 两条路以同一个条件互斥（window.CSS.supports 与 CSS 的 @supports 同源判断），
 * 无 JS 且不支持时停在 scaleX(0)＝不可见，不会留一根卡住的满条。
 *
 * @param variant 'post'=详情页（各宽度都显示）；省略=首页/列表页（窄屏专属，见 responsive.css）。
 * @example
 * <ScrollProgress variant="post" />
 */
export default function ScrollProgress({ variant }: { variant?: 'post' }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (window.CSS?.supports?.('animation-timeline', 'scroll()')) return
    const el = ref.current
    if (!el) return
    let raf = 0
    const write = (): void => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
    }
    const onScroll = (): void => {
      if (!raf) raf = requestAnimationFrame(write)
    }
    // 首帧先对一次：前进/后退恢复的滚动位置不该等到用户再滚一下才纠正
    write()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return <div className={variant === 'post' ? 'scroll-prog scroll-prog-post' : 'scroll-prog'} ref={ref} aria-hidden="true" />
}
