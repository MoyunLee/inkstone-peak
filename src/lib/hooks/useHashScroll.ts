import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 让 URL 的 hash 真正落地：按当前 location.hash 找到目标元素并滚到它。
 *
 * 目标元素若在挂载时尚未渲染（预渲染/异步内容），用 MutationObserver 等最多 2 秒；无 hash 时不做任何事。
 *
 * @returns 无返回值；需在路由组件内调用（依赖 useLocation）。
 * @example
 * function Page() {
 *   useHashScroll()
 *   return <section id="about">…</section>
 * }
 */
export function useHashScroll(): void {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const go = (el: Element): void => {
      el.scrollIntoView({ block: 'start', behavior: 'instant' }) // 显式 instant：防继承 html{scroll-behavior:smooth}
    }
    const first = document.getElementById(id)
    if (first) {
      go(first)
      return
    }
    const mo = new MutationObserver(() => {
      const el = document.getElementById(id)
      if (el) {
        mo.disconnect()
        go(el)
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
    const cap = window.setTimeout(() => mo.disconnect(), 2000)
    return () => {
      mo.disconnect()
      clearTimeout(cap)
    }
  }, [hash])
}
