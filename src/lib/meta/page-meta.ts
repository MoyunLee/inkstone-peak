// 路由 → 页面元信息的唯一模型（title / description / canonical / keywords / noindex / lang）。
// 两个消费者：构建期 scripts/pre-render.ts 写进各路由 HTML；运行期 components/layout/RouteMeta 在 SPA 换页时改写 document。
// 本文件必须零依赖（不碰 DOM、不碰 node:）——两侧才都能 import。
// ★路由表从 site.yml `nav` 派生（静态页 = nav[].route；详情页 = posts[].to 直接对上），
//   本文件不写死任何站内路径：改 detailPrefix / 加一个导航条目，页面与元信息自动跟上。

/** nav 条目（与 SiteData.nav 同形，只取元信息用到的字段）。 */
interface MetaNavInput {
  ink: string
  route?: string | null
  isDetailPage: boolean
  detailPrefix?: string | null
  module?: string | null
}

/** 与 .content/site.json 顶层同形：构建期直传 JSON，运行期直传 lib/data/site 的 SiteData。 */
export interface MetaSiteInput {
  site: { title: string; description: string; url: string; lang?: string; author?: string }
  nav: MetaNavInput[]
  /** 页面 meta 专名：键 = 路由 basename；另加首页专用键 `home`（首页 basename 是空串，无段名可用）。 */
  page_meta?: Record<string, string> | null
  /** 页面 meta 摘要专写：键法同 page_meta（首页用 `home`）；未命中回落 STATIC_DESC 策略小表。 */
  page_desc?: Record<string, string> | null
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
  /** 发布日（ISO）——分享卡的 article:published_time 取它。 */
  date: string
  /** 最后更新日；缺省时 dateModified / article:modified_time 回落 date。 */
  updated?: string | null
  tags?: string[]
  description?: string | null
  keywords?: string | null
}

/** 社交分享卡（og:* / twitter:* / article:*）。**只由构建期 pre-render 消费**——SPA 换页不改写它，理由同 jsonld.ts。 */
interface OgModel {
  /** og:type：静态页 / 列表页 = website；详情页 = article。 */
  type: 'website' | 'article'
  /** 绝对地址。全站共用一张手工默认卡 = source/site/og/default.png（1200×630，配方见 scripts/og-card.ts）。 */
  image: string
  imageAlt: string
  /** 仅 article：发布 / 修改时间（取 date / updated——与 JSON-LD 同一份事实）。 */
  publishedTime?: string
  modifiedTime?: string
}

/** pageMeta 的返回值：一个路由完整的元信息。 */
interface RouteMetaModel {
  title: string
  description: string
  canonical: string
  lang: string
  keywords?: string
  noindex?: boolean
  /** 缺失 = 不出分享卡（404 口径刻意不出）。 */
  og?: OgModel
}

/**
 * 静态页摘要取法（策略小表，不是路径白名单）：
 *   site  → site.description
 *   intro → 该页 module 对应首页段的 intro，缺则回落 site.description
 * 键 = 路由 basename（'/' 记作 ''）。**未列出的新页默认 site**，所以从 nav 新增页面无需改这里。
 * 前置：site.yml 的 page_desc 命中该页时优先（见 pageMeta 内），本表只管「没专写」的页。
 * ★2026-10-03 清理：原先还有第三档 heading（取该段 heading）——它唯一的消费者是独立传音页，
 *   页面一退役即成**不可达分支**，连同表里那一行一起删。要用它：表里加回「键: 'heading'」，
 *   并在 pageMeta 的三元里补回 heading 那一支（经过见 80 该日行）。
 */
/** 分享卡默认图（站点根静态件，手工入仓；改图重跑 scripts/og-card.ts）。 */
const OG_IMAGE = '/og/default.png'

const STATIC_DESC: Record<string, 'site' | 'intro'> = {
  '': 'site',
  portfolio: 'site',
  about: 'site',
  blog: 'intro',
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
function routeKey(path: string): string {
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
  const author = info.author?.trim()
  const pm = site.page_meta ?? {}
  const pd = site.page_desc ?? {}
  const lang = info.lang ?? 'zh-CN'
  const out = (title: string, description: string, extra?: Partial<RouteMetaModel>): RouteMetaModel => ({
    title,
    description,
    canonical: siteUrl + p,
    lang,
    ...extra,
  })
  // 分享卡：全站共用同一张默认卡，详情页只把 type 改成 article 并补上时间——卡面文案（站名 / 作者 / 定位句）
  // 与页面同源，不在元信息这层另写一套。
  const ogCard = (extra?: Partial<OgModel>): OgModel => ({
    type: 'website',
    image: siteUrl + OG_IMAGE,
    imageAlt: [info.title, author].filter(Boolean).join(' · '),
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
    const fallback = how === 'intro' ? (sec?.intro ?? info.description) : info.description
    // 摘要：page_desc 专写优先（键法同 page_meta，首页用 `home`）；未命中回落策略小表（新页零配置）。
    const description = pd[key === '' ? 'home' : key] || fallback
    // 首页 basename 是空串（routeKey('/') → ''），没有可用的路由段名 ⇒ 本节唯一破例的键 `home`：
    // 值是首页整条 <title>（不套「<专名> · <站名>」后缀，好把作者与职业关键词放进首页）；缺键回落 site.title。
    return out(p === '/' ? (pm.home ?? info.title) : `${named} · ${info.title}`, description, { og: ogCard() })
  }

  // ② 详情页：只看文章的落点 to（前缀由 site.yml 的 detailPrefix 决定，本文件不认前缀）
  const post = posts.find((x) => normalizePath(x.to) === p)
  if (post) {
    const title = `${post.title} · ${info.title}`
    const og = ogCard({ type: 'article', publishedTime: post.date, modifiedTime: post.updated || post.date })
    if (post.kind === 'work') return out(title, post.description || info.description, { og })
    const keywords = post.keywords || (post.tags ?? []).join(',')
    return out(title, post.description || info.description, keywords ? { keywords, og } : { og })
  }

  // ③ 其余：404 口径（noindex）
  return out(`${site.notfound.line} · ${info.title}`, site.notfound.line, { noindex: true })
}
