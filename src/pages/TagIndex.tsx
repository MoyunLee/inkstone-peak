/* /tags 标签索引页：全量（含作品）条目的标签清单，每枚链到它自己的聚合页（tagPath 生成，对外一律转义形态）。 */
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import { tagIndex, tagPath } from '../lib/data/content'
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

export default function TagIndex() {
  const site = useSite()
  // 本页唯一 h1：只给读屏与爬虫（首屏就是标签清单本身，不做可见大题）。文案 = 该页在导航里的名字（site.yml nav ink）。
  // 按 route 取词而**不用 navInk**：navInk 是按 nav 条目的 module 匹配的，而本页条目 module 是 null
  //（「标签」不对应首页任何一段，module 全站唯一）——用 navInk 永远取不到这枚词（与 /archive 同一处置）。
  const heading = site.nav.find((n) => navBase(n.route) === '/tags')?.ink
  // 清单顺序与条目集合全部落在 tagIndex（唯一排序契约的唯一消费者），本页只落位、不排序。
  const buckets = tagIndex()
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main tags-page">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        {/* 区块可访问名复用 h1 那枚 ink（不新增 a11y 键）：清单里只有标签名与数字，读屏靠它才知道这是哪一块。 */}
        <ul className="tags-index" aria-label={heading}>
          {buckets.map((b) => (
            <li className="tags-index-item" key={b.tag}>
              <Link className="tags-index-link" to={tagPath(b.tag)}>
                {b.tag}
                <span className="tags-index-count">{b.items.length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
