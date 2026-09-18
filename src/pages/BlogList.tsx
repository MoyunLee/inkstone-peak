/* /blog 归档页（扁平单网格）——文章渲染交给 ArticleGrid（与首页造境段同源）。 */
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import ArticleGrid from '../components/ui/article/ArticleGrid'
import Heatmap from '../components/ui/heatmap'
import { articles } from '../lib/data/content'
import { useHashScroll } from '../lib/hooks/useHashScroll'
import { useSite } from '../lib/data/site'

export default function BlogList() {
  useHashScroll()
  const site = useSite()
  // 热力图吃全站文章（含作品）
  const heatItems = articles.map((a) => ({ date: a.date, count: 1 }))
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main blog-list">
        {site.heatmap ? <Heatmap items={heatItems} labels={site.heatmap} /> : null}
        {/* 有意不传 limit：本页是归档，必须全量（截断会让超出部分站内不可达）。 */}
        <ArticleGrid entries={articles} cfg={site.blog} workTag={site.blog?.work_tag} />
      </main>
      <SiteFooter />
    </>
  )
}
