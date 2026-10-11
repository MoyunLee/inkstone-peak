/* /tags/<标签> 单标签聚合页：页名（标签名）+ 顶栏那条筛选带 + 条目网格。
   路由参数已由 React Router 解码（URL 里是 tagPath 生成的转义串），故这里拿到的是原样标签名。 */
import { useParams } from 'react-router-dom'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import ArticleGrid from '../components/ui/article/ArticleGrid'
import TagChip from '../components/ui/TagChip'
import { tagIndex } from '../lib/data/content'
import { navRouteInk, useSite } from '../lib/data/site'
import NotFound from './NotFound'

export default function TagDetail() {
  const { tag } = useParams()
  const site = useSite()
  const name = tag ?? ''
  // 标签清单与各个桶全在 tagIndex（唯一排序契约的唯一消费者）：本页既要用「我这一桶的条目」，
  // 也要用「全部标签」铺那条筛选带 —— 同一次调用同时给出两者，故不再单取一次（两处不可能分叉）。
  const buckets = tagIndex()
  const current = buckets.find((b) => b.tag === name)
  // 未知标签整页走 404（与 /blog/<slug>、/portfolio/<slug> 同一处置）；桶里的条目数恒 > 0，故有桶即非空。
  if (!current) return <NotFound />
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main tags-page">
        {/* 本页唯一 h1（2026-10-11 起**可见**）：文字 = 标签名本身（数据在上，可见层零新增中文）。
            参考站那一页顶上没有页名（只有筛选带），本站在带子之前立一枚页名——落点与 /archive、/tags 同一行语言。 */}
        <header className="page-head">
          <h1 className="page-head-title">{name}</h1>
        </header>
        {/* 筛选带：全部标签一枚不落（口径同 /tags 那面墙，只是不带墨阶），当前这枚挂 aria-current="page"。
            可访问名复用「标签」这枚 nav ink（不新增 a11y 键）：带子里只有标签名与数字。 */}
        <ul className="tags-rail" aria-label={navRouteInk(site, '/tags')}>
          {buckets.map((b) => (
            <li key={b.tag}>
              <TagChip tag={b.tag} count={b.items.length} current={b.tag === name} />
            </li>
          ))}
        </ul>
        {/* 有意不传 limit：聚合页必须全量（截断会让该标签下的条目站内不可达）；排序在 ArticleGrid 里做，勿再排一次。 */}
        <ArticleGrid entries={current.items} cfg={site.blog} workTag={site.blog?.work_tag} />
      </main>
      <SiteFooter />
    </>
  )
}
