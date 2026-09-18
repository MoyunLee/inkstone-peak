// 首页：段落顺序与文案全来自 site.yml home.sections（顺序权威），sections.ts 只做 id→组件映射。
import { useEffect } from 'react'
import Header from '../components/layout/Header'
import SideTabs from '../components/layout/SideTabs'
import { useHashScroll } from '../lib/hooks/useHashScroll'
import { useSite } from '../lib/data/site'
import { sectionComponents } from '../site/sections'
import type { SectionId } from '../site/sections'

export default function Home() {
  const site = useSite()
  useHashScroll()
  // animation-timeline 不支持时 rAF 单变量兜底
  useEffect(() => {
    if (window.CSS?.supports?.('animation-timeline', 'scroll()')) return
    const el = document.querySelector<HTMLElement>('.scroll-prog')
    if (!el) return
    let raf = 0
    const tick = (): void => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <>
      <Header />
      <div className="scroll-prog" aria-hidden="true" />
      <main id="main-content">
        {site.home.sections.map((sec) => {
          const Comp = sectionComponents[sec.id as SectionId]
          // 段落一律同步挂载（见 site/sections.ts）：不再有「占位段未挂载→静态段顶前→首屏误画」的窗口
          return <Comp key={sec.id} />
        })}
      </main>
      <SideTabs />
    </>
  )
}
