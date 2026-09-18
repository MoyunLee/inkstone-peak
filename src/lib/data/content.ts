// 事实集合的只读源：posts.json 由 scripts/content 构建期生成（site.yml 配置随 site.json 走）。
// 统一数据源 = .content/posts.json 一份；/blog 与 /portfolio 只是它的两种视图（按 tags 里的类型标记分流）。
import postsJson from '../../../.content/posts.json'
import siteJson from '../../../.content/site.json'
import type { ArticleEntry, PostArticle, WorkArticle } from '../types/content'

export type { ArticleEntry, PostArticle, WorkArticle } from '../types/content'

// as unknown as 只因 JSON 导入会把字面量拓宽成 string；schema 漂移由 scripts/content 的类型对账在 tsc 阶段拦下。
export const posts = postsJson as unknown as ArticleEntry[]

/** 类型标记：tags 含此值 = 作品。事实源 = site.yml 的 blog.portfolio_tag（缺省回落常量）。 */
export const PORTFOLIO_TAG = siteJson.blog?.portfolio_tag ?? 'portfolio'

/** /portfolio 视图：同一份数据里 tags 含类型标记的那些（构建期用同一 tags 定 kind，两者恒等）。 */
export const works = posts.filter((p): p is WorkArticle => p.tags.includes(PORTFOLIO_TAG))

/** /blog 视图：**全量**（含作品）——/blog 是中心库，作品只是带标记的一类。 */
export const articles: ArticleEntry[] = posts

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
