/* /blog 归档页（扁平单网格）——文章渲染交给 ArticleGrid（与首页造境段同源）。 */
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import ArticleGrid from '../components/ui/article/ArticleGrid'
import Heatmap from '../components/ui/heatmap'
import { articles, heatItems } from '../lib/data/content'
import { useHashScroll } from '../lib/hooks/useHashScroll'
import { navInk, useSite } from '../lib/data/site'

export default function BlogList() {
  useHashScroll()
  const site = useSite()
  // 本页唯一 h1：只给读屏与爬虫（首屏是热力图，标题挤进去会破版）。文案 = 该页在导航里的名字（site.yml nav ink）。
  const heading = navInk(site, 'blog')
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main blog-list">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        {site.heatmap ? <Heatmap items={heatItems} labels={site.heatmap} /> : null}
        {/* 有意不传 limit：本页是归档，必须全量（截断会让超出部分站内不可达）。 */}
        <ArticleGrid entries={articles} cfg={site.blog} workTag={site.blog?.work_tag} />
      </main>
      <SiteFooter />
    </>
  )
}
