// 路由 → JSON-LD 结构化数据的唯一模型（构建期 scripts/pre-render.ts 逐路由写进各页 <head>）。
// 两条约定（改之前先看 Dev_Docs 90 的 §4.8）：
//   ① **只做构建期**：SPA 换页不改写这段数据——JSON-LD 的消费者是爬虫，而爬虫逐 URL 冷载、不点你的 SPA，
//      为「换页后 <head> 里那段过期数据」再写一套运行期同步不划算。★这是全站唯一一处刻意不做运行期同步的 head 数据。
//   ② **零事实**：人名 / 站名 / 域名 / 技能 / 社交链接 / 日期一律从 .content/{site,posts}.json 派生，
//      本文件不出现第二份副本（技能表住 site.yml 的 about.skills、链接住 contact、路由住 nav）。
// 本文件零依赖（不碰 DOM、不碰 node:），与 page-meta.ts 同风格；路由不写死任何站内路径。
// 刻意不出的字段：jobTitle（站内没有「职业」这一键，about.tags_left 是标签不是职务 → 不编，等有事实源再补）、
//   alumniOf（site.yml timeline 写明「在读」——还没毕业，用「校友」语义就是错的）。

import { navBase, normalizePath, tagPath } from './page-meta.ts'

/** nav 条目（只取结构化数据用到的字段；与 .content/site.json 顶层同形）。 */
interface JsonLdNavInput {
  ink: string
  route?: string | null
  isDetailPage: boolean
  detailPrefix?: string | null
  module?: string | null
}

/** 与 .content/site.json 顶层同形：构建期直传 JSON。 */
export interface JsonLdSiteInput {
  site: { title: string; author?: string; url: string; lang?: string }
  nav: JsonLdNavInput[]
  /** 技能表：全站唯一事实源，整表映射成 knowsAbout。 */
  about?: { skills?: { name: string }[] | null } | null
  /** 联系栏：带 http(s) url 的条目进 sameAs（email 与「筹建中」无 url 项自动跳过）。 */
  contact?: Record<string, { url?: string | null } | string | null> | null
}

/** 文章事实（只取结构化数据用到的字段；ArticleEntry / .content/posts.json 均可直接传入）。 */
export interface JsonLdArticleInput {
  slug: string
  to: string
  kind: 'post' | 'work'
  title: string
  date: string
  updated?: string | null
  description?: string | null
  keywords?: string | null
  tags?: string[]
  cover?: string | null
  video?: { src?: string | null } | null
  embeds?: { label: string; url: string }[] | null
}

/** 一页的完整结构化数据：该页所有节点共用一套 @graph（一页只出一个 script）。 */
interface JsonLdGraph {
  '@context': string
  '@graph': Record<string, unknown>[]
}

/**
 * 由路径推导该页的 JSON-LD 图。
 *
 * 节点按路由形态派生，不按 slug 写死：首页与「观自」页出 Person；每页出 BreadcrumbList（首页只有一层，不出）；
 * 博文详情出 BlogPosting；作品详情有视频槽出 VideoObject、没有则出 CreativeWork。
 * 标签聚合页只出 BreadcrumbList（根 → /tags → 标签名），刻意不出 Person / BlogPosting——它不是一条内容，只是一个索引。
 * 日期 / 封面 / 播放器地址 / 技能 / 社交链接全部现读事实，改一篇文章的 front-matter 就自动跟上。
 *
 * @param pathname 当前路径；可含 query/hash，函数内部会归一（与 pageMeta 同一套归一）。
 * @param site 构建期传 .content/site.json。
 * @param posts 构建期传 .content/posts.json。
 * @returns 该路由的 @graph；未命中任何路由（404 口径）返回 null——noindex 页不出结构化数据。
 * @example
 * const graph = jsonLd('/blog/front-matter-guide', site, posts)
 * // graph ? 注入 <script type="application/ld+json"> : 删掉锚点
 */
export function jsonLd(pathname: string, site: JsonLdSiteInput, posts: JsonLdArticleInput[]): JsonLdGraph | null {
  const info = site.site
  const siteUrl = info.url.replace(/\/+$/, '')
  const p = normalizePath(pathname)
  const lang = info.lang ?? 'zh-CN'
  const abs = (target: string): string =>
    /^https?:\/\//i.test(target) ? target : siteUrl + (target.startsWith('/') ? target : '/' + target)

  const navHit = site.nav.find((n) => navBase(n.route) === p)
  const post = posts.find((x) => normalizePath(x.to) === p)
  // 标签聚合页：路径是转义形态（tagPath），故同样按 tagPath 比对，不手写解码。标签清单从 posts 现算（与 page-meta 同一份事实）。
  const tag = [...new Set(posts.flatMap((x) => x.tags ?? []))].find((t) => tagPath(t) === p)
  // 兜底与 page-meta 同一条：未命中任何路由 = 404 口径（含未知标签），不出结构化数据
  if (!navHit && !post && !tag) return null

  const author = info.author?.trim()
  const personId = siteUrl + '/#person'
  const authorRef = author ? { '@type': 'Person', '@id': personId, name: author, url: siteUrl + '/' } : undefined
  const graph: Record<string, unknown>[] = []
  const isHome = p === '/'

  // ① 人：首页 + 「观自」页（按 nav 的 module 认页，不按路径段）。knowsAbout 整表吃技能、sameAs 吃联系栏真链接。
  if (author && (isHome || navHit?.module === 'about')) {
    const knowsAbout = (site.about?.skills ?? []).map((s) => s.name).filter((name) => name.length > 0)
    const sameAs = Object.values(site.contact ?? {}).flatMap((v) =>
      v && typeof v === 'object' && typeof v.url === 'string' && /^https?:\/\//i.test(v.url) ? [v.url] : [],
    )
    graph.push({
      '@type': 'Person',
      '@id': personId,
      name: author,
      alternateName: info.title,
      url: siteUrl + '/',
      ...(knowsAbout.length > 0 ? { knowsAbout } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    })
  }

  // ② 面包屑：根（山门）+ 本页；详情页再插一层它的父列表页。名字一律取 nav 的雅词——不另起一套称呼。
  const crumbs: Record<string, unknown>[] = []
  const crumb = (name: string, url: string): void => {
    crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name, item: url })
  }
  const home = site.nav.find((n) => navBase(n.route) === '/')
  if (home && home.ink.trim().length > 0) crumb(home.ink, siteUrl + '/')
  if (post) {
    const parent = site.nav.find(
      (n) => n.isDetailPage && !!n.detailPrefix && normalizePath(post.to).startsWith(navBase(n.detailPrefix) + '/'),
    )
    if (parent) crumb(parent.ink, abs(navBase(parent.route)))
    crumb(post.title, abs(p))
  } else if (tag) {
    // 标签页：根 → 标签索引页 → 标签名。父列表页 = nav 里 route 是本路径前缀的那条（本站即 /tags；从 nav 现取，不写死路径）。
    const index = site.nav.find((n) => p.startsWith(navBase(n.route) + '/'))
    if (index) crumb(index.ink, abs(navBase(index.route)))
    crumb(tag, abs(p))
  } else if (navHit && !isHome) {
    crumb(navHit.ink, abs(p))
  }
  // 只有一层（首页自己）不出面包屑：面包屑富结果要的是一条路径，一个点不构成路径
  if (crumbs.length >= 2) graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs })

  // ③ 主实体。VideoObject 的口径 = Google 的硬要求：name + thumbnailUrl + uploadDate + 至少一个 contentUrl / embedUrl
  //    （没有封面就不出 VideoObject——缺 thumbnailUrl 的富结果本来就不会被采纳，退成 CreativeWork 更诚实）。
  if (post) {
    const description = post.description || undefined
    const cover = post.cover ? abs(post.cover) : undefined
    const embedUrl = post.embeds?.find((e) => e.url.length > 0)?.url
    const contentUrl = post.video?.src ? abs(post.video.src) : undefined
    const dateModified = post.updated || post.date
    if (post.kind === 'post') {
      const keywords = post.keywords || (post.tags ?? []).join(',')
      graph.push({
        '@type': 'BlogPosting',
        headline: post.title,
        ...(description ? { description } : {}),
        datePublished: post.date,
        dateModified,
        inLanguage: lang,
        mainEntityOfPage: abs(p),
        ...(authorRef ? { author: authorRef } : {}),
        ...(cover ? { image: cover } : {}),
        ...(keywords ? { keywords } : {}),
      })
    } else if (cover && (embedUrl || contentUrl)) {
      graph.push({
        '@type': 'VideoObject',
        name: post.title,
        ...(description ? { description } : {}),
        uploadDate: post.date,
        thumbnailUrl: cover,
        ...(embedUrl ? { embedUrl } : {}),
        ...(contentUrl ? { contentUrl } : {}),
        inLanguage: lang,
        ...(authorRef ? { creator: authorRef } : {}),
      })
    } else {
      graph.push({
        '@type': 'CreativeWork',
        name: post.title,
        ...(description ? { description } : {}),
        datePublished: post.date,
        dateModified,
        inLanguage: lang,
        mainEntityOfPage: abs(p),
        ...(authorRef ? { creator: authorRef } : {}),
        ...(cover ? { image: cover } : {}),
      })
    }
  }

  return graph.length > 0 ? { '@context': 'https://schema.org', '@graph': graph } : null
}

/**
 * 序列化成可安全内联进 <script type="application/ld+json"> 的文本。
 *
 * 只把 `<` 换成 \u003c（防标题或正文里的 </script 提前收尾）。script 是原始文本元素、不认 HTML 实体，
 * 所以**不能**用 pre-render 的 esc()——那会把引号变成 &quot;，JSON 当场废掉。
 *
 * @param graph jsonLd() 的返回值。
 * @example
 * const json = serializeJsonLd(graph).split('\n').map((line) => '      ' + line).join('\n')
 */
export function serializeJsonLd(graph: JsonLdGraph): string {
  return JSON.stringify(graph, null, 2).replace(/</g, '\\u003c')
}
