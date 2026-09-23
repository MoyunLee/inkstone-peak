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
export function pinRank(e: ArticleEntry): [number, number] {
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
