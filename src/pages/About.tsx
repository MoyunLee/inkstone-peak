import AboutIntro, { BENTO_GRID } from '../components/about/AboutIntro'
import CareerCard from '../components/about/CareerCard'
import GameStatsCard from '../components/about/GameStatsCard'
import PlaceCard from '../components/about/PlaceCard'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import { hasGameLog, hasLocation, hasTimeline } from '../lib/data/about'
import { useSite } from '../lib/data/site'
import { useHashScroll } from '../lib/hooks/useHashScroll'

export default function About() {
  const site = useSite()
  useHashScroll()
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main">
        {/* 便当盒三档响应式：sm 单列 → md 整行 → lg 2+1（对齐参考图跨列），md 整行避免尾部空档。 */}
        <section id="about" className={BENTO_GRID}>
          <AboutIntro />
          {/* 缺省即隐藏：对应事实块没写，整卡不渲染（网格自动回流） */}
          {hasTimeline(site) ? <CareerCard className="md:col-span-2 lg:col-span-1" /> : null}
          {hasGameLog(site) ? <GameStatsCard className="md:col-span-2 lg:col-span-2" /> : null}
          {hasLocation(site) ? <PlaceCard className="md:col-span-2 lg:col-span-1" /> : null}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
