/* /tags/<标签> 单标签聚合页：条目渲染交给 ArticleGrid（排序契约的唯一消费者），本页只落位。
   路由参数已由 React Router 解码（URL 里是 tagPath 生成的转义串），故这里拿到的是原样标签名。 */
import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import ArticleGrid from '../components/ui/article/ArticleGrid'
import { entriesByTag } from '../lib/data/content'
import { useSite } from '../lib/data/site'
import NotFound from './NotFound'

export default function TagDetail() {
  const { tag } = useParams()
  const site = useSite()
  const name = tag ?? ''
  // 未知标签整页走 404（与 /blog/<slug>、/portfolio/<slug> 同一处置）；有标签就一定非空，故下面是稳定的单值。
  const entries = entriesByTag(name)
  if (entries.length === 0) return <NotFound />
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main tags-page">
        {/* 本页唯一 h1：只给读屏与爬虫（首屏就是条目网格）。文案 = 标签名本身，可见层零新增中文。 */}
        <h1 className="sr-only">{name}</h1>
        {/* 有意不传 limit：聚合页必须全量（截断会让该标签下的条目站内不可达）；排序在 ArticleGrid 里做，勿再排一次。 */}
        <ArticleGrid entries={entries} cfg={site.blog} workTag={site.blog?.work_tag} />
      </main>
      <SiteFooter />
    </>
  )
}
