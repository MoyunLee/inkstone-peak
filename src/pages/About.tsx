import AboutIntro, { BENTO_GRID } from '../components/about/AboutIntro'
import CareerCard from '../components/about/CareerCard'
import PlaceCard from '../components/about/PlaceCard'
import SkillBoard from '../components/about/SkillBoard'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import { hasLocation, hasSkills, hasTimeline } from '../lib/data/about'
import { useSite } from '../lib/data/site'
import { useHashScroll } from '../lib/hooks/useHashScroll'

export default function About() {
  const site = useSite()
  useHashScroll()
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main">
        {/* 便当盒三档响应式：sm 单列 → md 整行 → lg 三列。md 一律整行，避免尾部空档。
            末两行固定为「技能(3)」再「坐标(2) + 生涯(1)」——技能独占整行成为长模块，
            坐标与生涯合成其后一行。 */}
        <section id="about" className={BENTO_GRID}>
          <AboutIntro showSkill={false} />
          {hasSkills(site) ? <SkillBoard className="md:col-span-2 lg:col-span-3" /> : null}
          {/* 缺省即隐藏：对应事实块没写，整卡不渲染（网格自动回流） */}
          {hasLocation(site) ? <PlaceCard className="md:col-span-2 lg:col-span-2" /> : null}
          {hasTimeline(site) ? <CareerCard className="md:col-span-2 lg:col-span-1" /> : null}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}