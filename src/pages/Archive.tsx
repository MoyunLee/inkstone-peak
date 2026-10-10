/* /archive 归档页（年 → 月两级时间线）——数据与 /blog 同源同序（全量 articles，含作品），只换排布。 */
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import { archiveTree, articles } from '../lib/data/content'
import { useSite } from '../lib/data/site'

/**
 * nav 基路径口径：去 `#锚`、空值回落 `/`——与 scripts/pre-render.ts 和 lib/meta/page-meta.ts 的 navBase 同义。
 *
 * @param route nav 条目的 route。
 * @returns 用于比对的基础路由。
 */
function navBase(route: string | null | undefined): string {
  return (route ?? '/').split('#')[0] || '/'
}

export default function Archive() {
  const site = useSite()
  // 本页唯一 h1：只给读屏与爬虫（首屏就是时间线本身，不做可见大题）。文案 = 该页在导航里的名字（site.yml nav ink）。
  // 按 route 取词而**不用 navInk**：navInk 是按 nav 条目的 module 匹配的，而本页条目不能挂 module
  //（「归档」不对应首页任何一段，且 module 全站唯一、blog 已被 /blog 占用）——用 navInk 永远取不到这枚词。
  const heading = site.nav.find((n) => navBase(n.route) === '/archive')?.ink
  // 分组与排序全部落在 archiveTree（唯一排序契约的唯一消费者），本页只落位、不排序。
  const tree = archiveTree(articles)
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main archive-page">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        {/* 区块可访问名复用 h1 那枚 ink（不新增 a11y 键）：文字全是数字，读屏靠它才知道这是哪块。 */}
        <ol className="archive-timeline" aria-label={heading}>
          {tree.map((y) => (
            <li className="archive-year" key={y.year}>
              {/* 年 / 月标签一律**纯数字**（2026 / 09）：全站 ISO 口径，中文闸与 site.yml 单一事实源都不破。 */}
              <h2 className="archive-year-num">{y.year}</h2>
              {y.months.map((m) => (
                <div className="archive-month" key={m.key}>
                  <h3 className="archive-month-num">{m.key.slice(5, 7)}</h3>
                  <ol className="archive-list">
                    {m.items.map((it) => (
                      <li className="archive-item" key={it.slug}>
                        <Link className="archive-link" to={it.to}>
                          {it.title}
                        </Link>
                        <time className="archive-date" dateTime={it.date}>
                          {it.date}
                        </time>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  )
}
