import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/**
 * 瀑布流布局：把每张卡的实际高度换算成 grid 行轨跨度，让各列紧凑堆叠（纯 CSS 做不出列内补位）。
 *
 * 依赖 CSS 侧 `.portfolio.is-masonry { grid-auto-rows: 8px }`——本文件的 UNIT 必须与之一致。
 * 挂载后自量一次；此后容器与子元素的尺寸变化由 ResizeObserver 自动重排，调用方不需要手动触发。
 *
 * @param ref 瀑布流容器的 ref；容器未挂载时本次 effect 直接跳过。
 * @returns 无返回值。
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useMasonry(ref)
 * return <div className="portfolio is-masonry" ref={ref}>{cards}</div>
 */
export function useMasonry(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid) return
    const UNIT = 8 // 与 CSS .portfolio.is-masonry{grid-auto-rows:8px} 必须一致
    let raf = 0
    const layout = (): void => {
      raf = 0
      const gap = Number.parseFloat(getComputedStyle(grid).rowGap) || 0
      for (const child of Array.from(grid.children)) {
        const el = child as HTMLElement
        const mt = Number.parseFloat(getComputedStyle(el).marginTop) || 0
        const h = el.getBoundingClientRect().height + mt
        el.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + gap) / (UNIT + gap)))}`
      }
    }
    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(layout)
    }
    grid.style.alignItems = 'start' // 量高期间解除等高拉伸，行轨仍 auto → 文档高度不塌
    // ① 同步量高写 span，② 再切 8px 行轨（span 已就位）
    layout()
    grid.classList.add('is-masonry')
    grid.style.alignItems = ''
    const ro = new ResizeObserver(schedule)
    for (const child of Array.from(grid.children)) ro.observe(child)
    ro.observe(grid) // 容器高变=有卡新增/列数切换 → 顺带重排（幂等收敛）
    window.addEventListener('resize', schedule)
    if (document.fonts) void document.fonts.ready.then(schedule)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
}
