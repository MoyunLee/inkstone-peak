/* /tags 标签索引页：全量（含作品）条目的标签墙，每枚链到它自己的聚合页（tagPath 生成，对外一律转义形态）。 */
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import TagChip from '../components/ui/TagChip'
import { tagIndex } from '../lib/data/content'
import { navRouteInk, useSite } from '../lib/data/site'

export default function TagIndex() {
  const site = useSite()
  // 本页唯一 h1（2026-10-11 起**可见**，与 /archive 同一条页名语言）：文案 = 该页在导航里的名字（site.yml nav ink）。
  // 按 route 取词而**不用 navInk**：navInk 是按 nav 条目的 module 匹配的，而本页条目 module 是 null
  //（「标签」不对应首页任何一段，module 全站唯一）——用 navInk 永远取不到这枚词（与 /archive 同一处置）。
  const heading = navRouteInk(site, '/tags')
  // 清单顺序与条目集合全部落在 tagIndex（唯一排序契约的唯一消费者），本页只落位、不排序。
  const buckets = tagIndex()
  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main tags-page">
        {/* 页名可见（不再是 .sr-only）：取的是参考站（blog.anheyu.com/tags）那层「页名 + 一墙标签」的结构，
            落到自家的楷体页名 + 发丝线（.page-head，与 /archive 共用一份皮肤）——不抄它的居中大标题与彩色徽章。 */}
        {heading ? (
          <header className="page-head">
            <h1 className="page-head-title">{heading}</h1>
          </header>
        ) : null}
        {/* 区块可访问名复用 h1 那枚 ink（不新增 a11y 键）：墙里只有标签名与数字，读屏靠它才知道这是哪一块。 */}
        <ul className="tags-wall" aria-label={heading}>
          {buckets.map((b) => (
            <li key={b.tag}>
              <TagChip tag={b.tag} count={b.items.length} />
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
