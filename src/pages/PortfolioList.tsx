/* /portfolio 观山列表页——文章渲染交给 CaseGrid（与首页观山段同源）。 */
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import FadeCarousel from '../components/ui/FadeCarousel'
import CaseGrid from '../components/ui/article/CaseGrid'
import type { CarouselItem } from '../components/ui/FadeCarousel'
import { works } from '../lib/data/content'
import { navInk, useSite } from '../lib/data/site'

export default function PortfolioList() {
  const site = useSite()
  // 本页唯一 h1：只给读屏与爬虫（首屏是大图轮播，标题挤进去会破版）。文案 = 该页在导航里的名字（site.yml nav ink）。
  const heading = navInk(site, 'portfolio')
  // 轮播成员＝声明 carousel: true **且有封面**的作品（纯图轮播，没封面就没有可展示的东西）；
  // 顺序沿用 works 的构建期 date 倒序，与列表同序。
  const maxSlides = site.portfolio?.carousel?.max_slides // 缺省=不限
  const slides: CarouselItem[] = works
    .filter((w) => w.carousel === true && !!w.cover)
    .slice(0, maxSlides)
    .map((w) => ({ key: w.slug, title: w.title, to: w.to, cover: w.cover }))
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main portfolio-list">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        <FadeCarousel
          items={slides}
          labels={{ prev: site.a11y.carousel_prev, next: site.a11y.carousel_next }}
          intervalMs={site.portfolio?.carousel?.interval_ms}
          className="portfolio-carousel"
        />
        <CaseGrid items={works} page />
      </main>
      <SiteFooter />
    </>
  )
}
