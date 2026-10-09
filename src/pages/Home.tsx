// 首页：段落顺序与文案全来自 site.yml home.sections（顺序权威），sections.ts 只做 id→组件映射。
import Header from '../components/layout/Header'
import SideTabs from '../components/layout/SideTabs'
import ScrollProgress from '../components/ui/ScrollProgress'
import { useHashScroll } from '../lib/hooks/useHashScroll'
import { useSite } from '../lib/data/site'
import { sectionComponents } from '../site/sections'
import type { SectionId } from '../site/sections'

export default function Home() {
  const site = useSite()
  useHashScroll()
  return (
    <>
      <Header />
      {/* 阅读进度：驱动（CSS 时间线 / JS 兜底）全在组件里，本页只落位 */}
      <ScrollProgress />
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
