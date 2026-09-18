// 路由 → 页面元信息的唯一模型（title / description / canonical / keywords / noindex / lang）。
// 两个消费者：构建期 scripts/pre-render.ts 写进各路由 HTML；运行期 components/layout/RouteMeta 在 SPA 换页时改写 document。
// 本文件必须零依赖（不碰 DOM、不碰 node:）——两侧才都能 import。
// ★路由表从 site.yml `nav` 派生（静态页 = nav[].route；详情页 = posts[].to 直接对上），
//   本文件不写死任何站内路径：改 detailPrefix / 加一个导航条目，页面与元信息自动跟上。

/** nav 条目（与 SiteData.nav 同形，只取元信息用到的字段）。 */
export interface MetaNavInput {
  ink: string
  route?: string | null
  isDetailPage: boolean
  detailPrefix?: string | null
  module?: string | null
}

/** 与 .content/site.json 顶层同形：构建期直传 JSON，运行期直传 lib/data/site 的 SiteData。 */
export interface MetaSiteInput {
  site: { title: string; description: string; url: string; lang?: string }
  nav: MetaNavInput[]
  page_meta?: Record<string, string> | null
  home: { sections: { id: string; heading?: string | null; intro?: string | null }[] }
  notfound: { line: string }
}

/** 只取元信息用到的那几个字段：ArticleEntry / PostArticle / WorkArticle 均可直接传入。 */
export interface MetaArticleInput {
  slug: string
  /** 详情页落点（构建期已由 nav 的 detailPrefix 派生）——详情页识别**只看这一列**，不看路径前缀。 */
  to: string
  kind: 'post' | 'work'
  title: string
  tags?: string[]
  description?: string | null
  keywords?: string | null
}

/** pageMeta 的返回值：一个路由完整的元信息。 */
export interface RouteMetaModel {
  title: string
  description: string
  canonical: string
  lang: string
  keywords?: string
  noindex?: boolean
}

/**
 * 静态页摘要取法（策略小表，不是路径白名单）：
 *   site    → site.description
 *   intro   → 该页 module 对应首页段的 intro，缺则回落 site.description
 *   heading → 该页 module 对应首页段的 heading，缺则回落 site.description
 * 键 = 路由 basename（'/' 记作 ''）。**未列出的新页默认 site**，所以从 nav 新增页面无需改这里。
 */
const STATIC_DESC: Record<string, 'site' | 'intro' | 'heading'> = {
  '': 'site',
  portfolio: 'site',
  about: 'site',
  blog: 'intro',
  footer: 'heading',
}

/** 路径归一：去 query/hash、去尾斜杠（根路径保留 '/'）。 */
export function normalizePath(pathname: string): string {
  const clean = (pathname.split('?')[0] ?? '/').split('#')[0] ?? '/'
  const trimmed = clean.length > 1 ? clean.replace(/\/+$/, '') : clean
  return trimmed === '' ? '/' : trimmed
}

/** nav 路由的基路径（去 #锚）：'/blog#x' → '/blog'；空值回落 '/'。 */
export function navBase(route: string | null | undefined): string {
  return ((route ?? '/').split('#')[0] || '/')
}

/** 路由的 basename：'/' → ''，'/portfolio' → 'portfolio'，'/a/b' → 'b'。 */
export function routeKey(path: string): string {
  const p = normalizePath(path)
  return p === '/' ? '' : (p.split('/').filter(Boolean).pop() ?? '')
}

/**
 * 由路径推导页面元信息（title / description / canonical / keywords / noindex / lang）。
 *
 * 构建期 scripts/pre-render.ts 与运行期 components/layout/RouteMeta 共用这一个函数，
 * 预渲染产物与 SPA 换页的口径因此必然一致（改口径只改这里一处）。
 * 匹配顺序：nav 页面级路由 → 文章落点 to → 兜底 404（noindex）。
 *
 * @param pathname 当前路径；可含 query/hash，函数内部会归一。
 * @param site 站点数据——构建期传 .content/site.json，运行期传 useSite()。
 * @param posts 文章清单——构建期传 posts.json，运行期传 lib/data/content 的 posts。
 * @returns 该路由完整的元信息；未命中任何路由时返回 404 口径（noindex: true）。
 * @example
 * const m = pageMeta('/portfolio/peeled-slug', site, posts)
 * // m.title / m.description / m.canonical 直接可写进 <head>
 */
export function pageMeta(pathname: string, site: MetaSiteInput, posts: MetaArticleInput[]): RouteMetaModel {
  const info = site.site
  const siteUrl = info.url.replace(/\/+$/, '')
  const p = normalizePath(pathname)
  const pm = site.page_meta ?? {}
  const lang = info.lang ?? 'zh-CN'
  const out = (title: string, description: string, extra?: Partial<RouteMetaModel>): RouteMetaModel => ({
    title,
    description,
    canonical: siteUrl + p,
    lang,
    ...extra,
  })

  // ① 页面级路由：**每个 nav 条目都有自己那份页面**（详情条目也一样——观山的 route=/portfolio 是列表页，
  //    详情页在 detailPrefix 之下）。所以这里按 route 全量匹配，不按 isDetailPage 过滤。
  const hit = site.nav.find((n) => navBase(n.route) === p)
  if (hit) {
    const key = routeKey(p)
    const named = key !== '' && pm[key] ? pm[key] : info.title
    const sec = site.home.sections.find((s) => s.id === (hit.module ?? ''))
    const how = STATIC_DESC[key] ?? 'site'
    const description =
      how === 'intro' ? (sec?.intro ?? info.description) : how === 'heading' ? (sec?.heading ?? info.description) : info.description
    return out(p === '/' ? info.title : `${named} · ${info.title}`, description)
  }

  // ② 详情页：只看文章的落点 to（前缀由 site.yml 的 detailPrefix 决定，本文件不认前缀）
  const post = posts.find((x) => normalizePath(x.to) === p)
  if (post) {
    const title = `${post.title} · ${info.title}`
    if (post.kind === 'work') return out(title, post.description || info.description)
    const keywords = post.keywords || (post.tags ?? []).join(',')
    return out(title, post.description || info.description, keywords ? { keywords } : undefined)
  }

  // ③ 其余：404 口径（noindex）
  return out(`${site.notfound.line} · ${info.title}`, site.notfound.line, { noindex: true })
}
