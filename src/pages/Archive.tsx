/* /archive 归档页（年 → 月 → 目 三级册页）——数据与 /blog 同源同序（全量 articles，含作品），只换排布。 */
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/layout/Header'
import SiteFooter from '../components/sections/SiteFooter'
import Heatmap from '../components/ui/heatmap'
import RespImg from '../components/ui/RespImg'
import Seal from '../components/ui/Seal'
import { COVER_TONES } from '../components/ui/article/ArticleCard'
import { archiveTree, articles, heatItems } from '../lib/data/content'
import { THUMB_SIZES } from '../lib/data/images'
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

/**
 * 某一天在年表里对应哪些条目（slug 清单）——口径与 `heatItems` **同源**：
 * 发布日记一条；`updated` 存在且与发布日不同时，更新日再记一条。
 * 两处必须同规，否则会出现「格子有色、点下去筛出一张空纸」的悬空近路。
 *
 * @param day `YYYY-MM-DD`。
 * @returns 命中该日的条目 slug（可能为空数组）。
 * @example
 * slugsOnDay('2026-09-26') // ['reborn-1985', 'girl-with-a-pearl-earring', '18th-ada']
 */
function slugsOnDay(day: string): string[] {
  return articles
    .filter((a) => a.date === day || (a.updated !== null && a.updated !== a.date && a.updated === day))
    .map((a) => a.slug)
}

export default function Archive() {
  const site = useSite()
  // 本页 h1（2026-10-11 起**可见**）：文案 = 该页在导航里的名字（site.yml nav ink）。
  // 按 route 取词而**不用 navInk**：navInk 是按 nav 条目的 module 匹配的，而本页条目不能挂 module
  //（「归档」不对应首页任何一段，且 module 全站唯一、blog 已被 /blog 占用）——用 navInk 永远取不到这枚词。
  const heading = site.nav.find((n) => navBase(n.route) === '/archive')?.ink
  // 热力图点中的那一天（YYYY-MM-DD）。**筛**而不是**滚**（用户令 2026-10-11）：
  // 那天更新了 3 条，就该只看见那 3 条——「滑到它的位置」在一屏放不下时等于什么都没说。
  // 「多少条」不另出裸数字：热力图题头（`{year} 年共更新 {n} 条`）本来就在说它。
  const [day, setDay] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement | null>(null)
  const hitSlugs = day ? slugsOnDay(day) : []
  // 空命中（数据改了 / slug 悬空）一律当没筛：宁可给全目，不可给一张空纸
  const filtering = day !== null && hitSlugs.length > 0
  const shown = filtering ? articles.filter((a) => hitSlugs.includes(a.slug)) : articles
  // 分组与排序全部落在 archiveTree（唯一排序契约的唯一消费者），本页只落位、不排序。
  // ★筛后仍走同一个 archiveTree：桶与桶内顺序照旧继承契约，筛选不改排序口径（含跨月的情形——
  //   那天更新的条目可能分属两个发布月，那就出两个月桶，读者正好看见「这天动过哪几篇」）。
  const tree = archiveTree(shown)

  /** 撤销筛选：焦点送回年表——按钮点完就随筛选条一起消失，不回焦＝焦点掉回 body。 */
  const clearDay = (): void => {
    setDay(null)
    listRef.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <Header />
      <main id="main-content" className="page-pad page-main archive-page">
        {heading ? (
          <header className="archive-head">
            <h1 className="archive-head-title">{heading}</h1>
          </header>
        ) : null}
        {/* 热力图与 /blog 同源同组件（同一份 heatItems、同一套 site.yml 文案），只多一层可选交互：
            点有更新的格子 → 下面的年表**只剩那天动过的条目**；再点同一格＝还原。
            近路只对指针用户开放（整图 aria-hidden，方块不进 Tab 序）——同一份事实在年表里逐条可读。 */}
        {site.heatmap ? (
          <Heatmap
            items={heatItems}
            labels={site.heatmap}
            onPickDay={(d) => setDay((prev) => (prev === d ? null : d))}
            pickedDay={day}
          />
        ) : null}
        {filtering ? (
          <div className="archive-filter">
            <p className="archive-filter-day">{day}</p>
            <button type="button" className="archive-clear" onClick={clearDay}>
              {site.a11y.archive_clear ?? 'archive_clear'}
            </button>
          </div>
        ) : null}
        {/* 区块可访问名复用 h1 那枚 ink（不新增第二枚 a11y 键）：年表本身只有数字与题目，读屏靠它才知道这是哪一块。
            tabIndex=-1 只为「撤筛选后把焦点送回这里」，不进 Tab 序。 */}
        <ol className="archive-timeline" aria-label={heading} ref={listRef} tabIndex={-1}>
          {tree.map((y) => (
            <li className="archive-year" key={y.year}>
              {/* 年 / 月标签一律**纯数字**（2026 / 09）：全站 ISO 口径，中文闸与 site.yml 单一事实源都不破。 */}
              <h2 className="archive-year-num">{y.year}</h2>
              {y.months.map((m) => (
                <div className="archive-month" key={m.key}>
                  <h3 className="archive-month-num">{m.key.slice(5, 7)}</h3>
                  <ol className="archive-list">
                    {m.items.map((it, i) => (
                      <li className="archive-item" key={it.slug}>
                        {/* 条目卡＝全站唯一的 `.card`（arc.css）**横排**：皮肤零新增，几何全在 archive.css。
                            题用 h4 而非 h3——h3 是上面的月号，本页四级齐全（页 h1 → 年 h2 → 月 h3 → 目 h4）。 */}
                        <Link className="card archive-card" to={it.to}>
                          {it.cover ? (
                            <span className="card-cover">
                              {/* 封面是装饰（卡的可访问名由标题文字给），故 alt 留空，免读屏重复念一遍 */}
                              <RespImg src={it.cover} sizes={THUMB_SIZES} />
                            </span>
                          ) : (
                            <span className="card-cover cover-ph" data-tone={String(i % COVER_TONES)} aria-hidden="true">
                              <Seal variant="mark" />
                            </span>
                          )}
                          <div className="card-body">
                            <h4 className="card-title">{it.title}</h4>
                            {it.tags.length > 0 ? (
                              <ul className="card-tags">
                                {it.tags.map((t) => (
                                  <li key={t}>{t}</li>
                                ))}
                              </ul>
                            ) : null}
                            <time className="card-date" dateTime={it.date}>
                              {it.date}
                            </time>
                          </div>
                        </Link>
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
