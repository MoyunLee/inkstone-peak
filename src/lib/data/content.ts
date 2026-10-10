// 事实集合的只读源：posts.json 由 scripts/content 构建期生成。
// 统一数据源 = .content/posts.json 一份；/blog 与 /portfolio 只是它的两种视图——**分流只看 kind**（构建期已定死），
// 运行层不认识任何“类型标记词”，故不存在“配置与常量分叉”的可能。
import postsJson from '../../../.content/posts.json'
import type { ArticleEntry, PostArticle, WorkArticle } from '../types/content'

export type { ArticleEntry, PostArticle, WorkArticle } from '../types/content'

// as unknown as 只因 JSON 导入会把字面量拓宽成 string；schema 漂移由 scripts/content 的类型对账在 tsc 阶段拦下。
export const posts = postsJson as unknown as ArticleEntry[]

/**
 * 置顶序（**唯一排序契约**）：/blog 归档网格与 /portfolio 收藏（列表 + 顶部轮播）共用同一份——
 * `swiper_index` 优先，其次 `top_group_index`，两个都没设(`null`)的排最后；同组内按索引升序。
 *
 * @param e 文章事实。
 * @example
 * // 想让某件作品在观山轮播排第一：它的 front-matter 写 swiper_index: 1
 */
function pinRank(e: ArticleEntry): [number, number] {
  if (e.swiper_index !== null) return [0, e.swiper_index]
  if (e.top_group_index !== null) return [1, e.top_group_index]
  return [2, 0]
}

/**
 * 同一份置顶契约下的完整比较：置顶组 → 组内索引 → 日期（方向由调用方给）。
 *
 * @param a 左
 * @param b 右
 * @param dir 日期方向；默认倒序（新的在前）
 * @example
 * entries.slice().sort((a, b) => compareArticles(a, b, 'desc'))
 */
export function compareArticles(a: ArticleEntry, b: ArticleEntry, dir: 'desc' | 'asc' = 'desc'): number {
  const ra = pinRank(a)
  const rb = pinRank(b)
  if (ra[0] !== rb[0]) return ra[0] - rb[0]
  if (ra[0] !== 2 && ra[1] !== rb[1]) return ra[1] - rb[1]
  return dir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
}

/**
 * /portfolio 视图：构建期判定为作品的那些（判据 = posts.json 的 kind，运行层唯一依据）。
 *
 * 顺序＝上面那份置顶契约 + `date` 倒序；**顶部轮播、观山列表、首页观山段共用这一个数组**，故三者恒同序
 * （轮播取其中声明了 `carousel: true` 且有 `cover` 的前 `max_slides` 张）。
 */
export const works = posts.filter((p): p is WorkArticle => p.kind === 'work').sort((a, b) => compareArticles(a, b, 'desc'))

/** /blog 视图：**全量**（含作品）——/blog 是中心库，作品只是带标记的一类。 */
export const articles: ArticleEntry[] = posts

/** 归档页的一个月桶：`key` = `YYYY-MM`，`items` = 该月条目（已按唯一排序契约定序）。 */
export interface ArchiveMonth {
  key: string
  items: ArticleEntry[]
}

/**
 * /archive 视图：全量条目按 `date` 分「年 → 月」两级（分组键取 ISO 字符串直切，**不经 Date**）。
 *
 * 排序口径：**先把全量按唯一排序契约排一遍（`compareArticles(…, 'desc')`），再顺着这个序列分桶**——
 * 桶的先后与桶内先后都直接继承契约本身（置顶组 → 组内索引 → 日期倒序），不自创第二套排序；
 * 相邻两条的 `date` 前缀一变就开新桶，故**页面渲染顺序 = 全量契约顺序**，逐项一致。
 *
 * @param entries 条目清单；缺省全量 `articles`（含作品，与 /blog 同口径）。
 * @returns 年桶数组（年倒序），每年 `months` 月桶数组（月倒序）。
 * @example
 * const tree = archiveTree(articles)
 * // [{ year: '2026', months: [{ key: '2026-09', items: [...] }, { key: '2026-03', items: [...] }] }]
 */
export function archiveTree(entries: ArticleEntry[] = articles): { year: string; months: ArchiveMonth[] }[] {
  const tree: { year: string; months: ArchiveMonth[] }[] = []
  for (const e of [...entries].sort((a, b) => compareArticles(a, b, 'desc'))) {
    const year = e.date.slice(0, 4)
    const key = e.date.slice(0, 7)
    const last = tree[tree.length - 1]
    const y = last && last.year === year ? last : { year, months: [] }
    if (y !== last) tree.push(y)
    const m = y.months[y.months.length - 1]
    if (m && m.key === key) m.items.push(e)
    else y.months.push({ key, items: [e] })
  }
  return tree
}

/**
 * 标签聚合页的对外 URL 口径（**站内唯一生成点**）：`/tags/` + 转义后的标签名，例如 `/tags/%E5%86%99%E4%BD%9C`。
 *
 * 落盘目录用**裸中文段**（`dist/tags/写作/index.html`），对外 URL 一律转义形态——React Router 匹配路由前会
 * 解码，故转义的 location 照样能在 `useParams()` 取到 `写作`；而浏览器实际请求的 pathname 就是转义串
 * （`new URL(...).pathname` 不解码），所以站内 href / canonical / sitemap / JSON-LD 全用这一个形态。
 * scripts/pre-render.ts 与 scripts/feeds.ts 不能 import src/，各自内联同一表达式（先例：navBase 的三份）。
 *
 * @param tag 标签名（原样中文）。
 * @returns 转义形态的站内绝对路径。
 * @example
 * tagPath('写作') // '/tags/%E5%86%99%E4%BD%9C'
 */
export function tagPath(tag: string): string {
  return '/tags/' + encodeURIComponent(tag)
}

/** 标签页的一个标签桶：`tag` = 标签名，`items` = 该标签下的条目（已按唯一排序契约定序）。 */
export interface TagBucket {
  tag: string
  items: ArticleEntry[]
}

/**
 * /tags 索引视图：遍历全量条目的 `tags` 去重成标签清单（`tags` 在构建期已剔掉 `portfolio` 标记，清单里只有真标签）。
 *
 * 排序口径：**先把全量按唯一排序契约排一遍（`compareArticles(…, 'desc')`），再顺着这个序列筛出每个标签的条目**
 * ——桶内顺序直接继承契约本身（与 `archiveTree` 的「先排一遍再分桶」同一写法），不自创第二套排序。
 * 清单本身的顺序：**条目数降序 → 平手按标签字符串的 Unicode 码点升序**（`<` 这类确定性比较，
 * 刻意不用 `localeCompare`——ICU 版本差异会让顺序不可复现）。
 *
 * @param entries 条目清单；缺省全量 `articles`（含作品，与 /blog 同口径）。
 * @returns 标签桶数组（条目数降序）= /tags 索引的渲染顺序。
 * @example
 * tagIndex().map((b) => `${b.tag}:${b.items.length}`) // ['写作:3', '建站:3', '配置:2', …]
 */
export function tagIndex(entries: ArticleEntry[] = articles): TagBucket[] {
  const ordered = [...entries].sort((a, b) => compareArticles(a, b, 'desc'))
  const names = [...new Set(entries.flatMap((e) => e.tags))]
  return names
    .map((tag) => ({ tag, items: ordered.filter((e) => e.tags.includes(tag)) }))
    .sort((a, b) => b.items.length - a.items.length || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
}

/**
 * 按标签取条目（/tags/:tag 用）——**集合与顺序与 `tagIndex()` 同源**：直接取该标签那个桶，两处不可能分叉。
 *
 * @param tag 标签名（路由已解码，原样中文）。
 * @param entries 条目清单；缺省全量 `articles`。
 * @returns 该标签的条目（已按唯一排序契约定序）；没有这个标签时返回 `[]`（调用方据此走 404）。
 * @example
 * const entries = entriesByTag(tag)
 * if (entries.length === 0) return <NotFound />
 */
export function entriesByTag(tag: string, entries: ArticleEntry[] = articles): ArticleEntry[] {
  return tagIndex(entries).find((b) => b.tag === tag)?.items ?? []
}

/**
 * 贡献热力图的喂料（全站文章含作品；**数据口径的唯一真源**）：每篇「发布日 + 更新日各记 1 条」。
 *
 * 两个日子都上历：发布格记「什么时候发的」，更新格记「最后一次动它是什么时候」。
 * 只认 `updated` 这一个字段（站内无历史版本，「改过几次」不可知），故一篇最多 2 条；
 * `updated` 缺省、或与 `date` 同日时只记发布日 1 条——同日双计会让那一格凭空翻倍。
 *
 * 结构即 `components/ui/heatmap` 的 `HeatItem`（组件侧零转换、零数据 import）。
 *
 * @example
 * // 18th-ada：date 2026-03-01 + updated 2026-09-19 → 03-01 与 09-19 各 +1
 * // 没写 updated 的篇目：只在发布日 +1
 */
export const heatItems: { date: string; count: number }[] = articles.flatMap((a) =>
  a.updated && a.updated !== a.date
    ? [
        { date: a.date, count: 1 },
        { date: a.updated, count: 1 },
      ]
    : [{ date: a.date, count: 1 }],
)

/**
 * 按 slug 取作品（/portfolio/:slug 用）。
 *
 * @param slug 路由参数；未命中路由时是 undefined，函数会直接返回 undefined。
 * @returns 命中的作品；slug 缺失或不是作品时返回 undefined（调用方据此走 404）。
 * @example
 * const { slug } = useParams()
 * const w = workBySlug(slug)
 * if (!w) return <NotFound />
 */
export function workBySlug(slug: string | undefined): WorkArticle | undefined {
  return slug ? works.find((w) => w.slug === slug) : undefined
}

/**
 * 按 slug 取博文（/blog/:slug 用）。
 *
 * 作品不在 /blog/<slug> 渲染——即使 slug 能命中作品，也返回 undefined 让调用方走 404。
 *
 * @param slug 路由参数；未命中路由时是 undefined。
 * @returns 命中的博文；slug 缺失、不存在、或是作品时返回 undefined。
 * @example
 * const { slug } = useParams()
 * const b = postBySlug(slug)
 * if (!b) return <NotFound />
 */
export function postBySlug(slug: string | undefined): PostArticle | undefined {
  if (!slug) return undefined
  const p = posts.find((x) => x.slug === slug)
  return p && p.kind === 'post' ? p : undefined
}

/**
 * 详情页「相关阅读」（**运行期**算）：相关度的唯一契约在本函数，组件只落位（见 components/ui/article/RelatedPosts）。
 *
 * 口径：
 *   · 候选池 = 全量 `posts`（含作品与博文，允许跨 kind），**排除自身**（slug 相同）；
 *   · 主信号 = **tags 交集个数**；交集为 0 的候选不入选（不出空壳，也不做同类兜底）；
 *   · `entry.relatedWork` 命中某候选 slug → 该候选**置顶，且不受交集为 0 限制**；
 *     指向不存在的 slug 时静默忽略（悬空只由构建期提醒，组件侧不得抛错）；
 *   · 其余候选：交集数降序 → 平手用 compareArticles(a, b, 'desc') 定序（复用唯一排序契约，不自创）。
 *
 * @param entry 当前页的文章事实。
 * @param limit 最多几条；默认 3（带注释的版面常量，**不落 site.yml**——不留死配置）。
 * @returns 已定序、已截断的候选；既无交集又无 relatedWork 命中时返回 `[]`（组件据此整块不出）。
 * @example
 * relatedTo(entry).map((e) => e.to)
 */
export function relatedTo(entry: ArticleEntry, limit = 3): ArticleEntry[] {
  const mine = new Set(entry.tags)
  const pinned = entry.relatedWork
  const scored = posts
    .filter((p) => p.slug !== entry.slug)
    .map((p) => ({ p, hit: p.tags.filter((t) => mine.has(t)).length }))
    .filter((s) => s.hit > 0 || s.p.slug === pinned)
  scored.sort((a, b) => {
    const pa = a.p.slug === pinned ? 1 : 0
    const pb = b.p.slug === pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    return b.hit - a.hit || compareArticles(a.p, b.p, 'desc')
  })
  return scored.slice(0, limit).map((s) => s.p)
}
