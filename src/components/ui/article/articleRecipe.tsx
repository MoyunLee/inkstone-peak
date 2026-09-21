/* 详情页内容配方（2026-09-21 统一壳子）：**作品与博文共用这一份**。
   题头（元信息行）、侧栏（提要 / 行 / 标签）、以及顶图 / 嵌入 / 版权三个槽，全在这里按数据算——
   外壳 ArticleDetail 只按顺序落位，**不认识 kind**；两型的差别只剩「显示标签」与作品专属数据
   （video / period / embeds / links，缺省即不出）。

   收口前两页各写一份配方：博文没提要、没嵌入槽与版权槽，作品没日期与分类，
   同一条 front-matter 长出两套页面。 */
import type { ReactNode } from 'react'
import type { ArticleEntry, WorkArticle } from '../../../lib/types/content'
import type { SiteData } from '../../../lib/types/site'
import PostCopyright from '../blog/PostCopyright'
import VideoHero from '../VideoHero'
import type { AsideRow } from './ArticleAside'

/** 日期项：`c`=发布、`u`=更新；行首词由各自的消费者贴（元信息行只给「更新于」，侧栏行两行都贴）。 */
interface DateItem {
  key: 'c' | 'u'
  dt: string
  text: string
}

/** 作品专属字段的取法：博文契约里没有这几个键，一律按空处理——kind 判断只出现在本文件。 */
function workPart(entry: ArticleEntry): Partial<WorkArticle> {
  return entry.kind === 'work' ? entry : {}
}

/** 展示标签：作品以 site.yml 的 work_tag 打头（类型标记词构建期已剔除，运行层只剩 kind）——与归档卡同一公式。 */
export function articleTags(entry: ArticleEntry, site: SiteData): string[] {
  const workTag = site.blog?.work_tag
  return entry.kind === 'work' && workTag ? [workTag, ...entry.tags] : entry.tags
}

/**
 * 日期项（date_type 口径的唯一实现，侧栏行与回落元信息行共用）：
 * created=只出发布 / updated=只出更新（缺则回落发布）/ both=都出；updated 与 date 同日只出一次。
 */
function metaDates(entry: ArticleEntry, site: SiteData): DateItem[] {
  const type = site.post_meta?.post?.date_type ?? 'both'
  const updated = entry.updated && entry.updated !== entry.date ? entry.updated : null
  if (type === 'updated') {
    // 缺 updated 时回落到发布日：它**就是发布日**，键位也须是 'c'——
    // 否则侧栏会把发布日标成「更新于 <发布日>」（假信息）。
    return updated
      ? [{ key: 'u', dt: updated, text: updated }]
      : [{ key: 'c', dt: entry.date, text: entry.date }]
  }
  const items: DateItem[] = [{ key: 'c', dt: entry.date, text: entry.date }]
  if (type === 'both' && updated) items.push({ key: 'u', dt: updated, text: updated })
  return items
}

/**
 * 元信息行——**只在侧栏关掉（`aside: false`）时回落到标题下**（2026-09-21 起元信息只有侧栏一处，
 * 两处同时出就成了重复；有侧栏时外壳不调用本函数）。
 *
 * 内容：日期 / 分类 / 周期（作品）/ 标签——标签恒在末位（与侧栏那排胶囊的位置呼应）。
 * 开关住 site.yml 的 post_meta.post（date_type / categories / tags / label），两型共用一套开关；
 * 一项都出不了时返回 null，调用方不必自己判断「有没有 meta」。
 *
 * @param entry 文章事实。
 * @param site 整份站点数据（读 post_meta / a11y / blog.work_tag）。
 * @example
 * {articleMeta(entry, site)}
 */
export function articleMeta(entry: ArticleEntry, site: SiteData): ReactNode {
  const pm = site.post_meta?.post
  const a = site.a11y
  const showLabel = pm?.label ?? true
  const dates = metaDates(entry, site)
  const categories = (pm?.categories ?? true) ? entry.categories : []
  const tags = (pm?.tags ?? true) ? articleTags(entry, site) : []
  const span = workPart(entry).period ?? null
  if (dates.length === 0 && categories.length === 0 && tags.length === 0 && !span) return null
  return (
    <ul className="bd-meta">
      {dates.map((d) => (
        <li key={d.key}>
          {d.key === 'u' && showLabel && a.post_updated ? `${a.post_updated} ` : ''}
          <time dateTime={d.dt}>{d.text}</time>
        </li>
      ))}
      {categories.length > 0 ? (
        <li>
          {showLabel && a.post_categories ? `${a.post_categories}：` : ''}
          {categories.join(' / ')}
        </li>
      ) : null}
      {span ? (
        <li>
          {showLabel && a.case_period ? `${a.case_period}：` : ''}
          {span}
        </li>
      ) : null}
      {tags.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}

/**
 * 侧栏行（署名与提要之下、标签与目录之上）：发布 / 更新于 / 分类 / 周期（作品）——两型同一套行。
 *
 * 元信息只剩侧栏一处后，site.yml 的 post_meta.post 开关就管这一处：
 * date_type 决定出哪几个日子、categories 决定出不出分类、label 决定行首词出不出。
 * 标签胶囊由 ArticleAside 的 tags 槽接管（传 articleAsideTags()），这里不重复列。
 *
 * @param entry 文章事实。
 * @param site 整份站点数据（读 post_meta 与 a11y 的行标签）。
 * @example
 * <ArticleAside author={site.site.author} rows={articleAsideRows(entry, site)} tags={articleAsideTags(entry, site)}>
 */
export function articleAsideRows(entry: ArticleEntry, site: SiteData): AsideRow[] {
  const pm = site.post_meta?.post
  const a = site.a11y
  const rowLabel = (label?: string) => ((pm?.label ?? true) ? label : undefined)
  const rows: AsideRow[] = metaDates(entry, site).map((d) => ({
    key: d.key,
    label: rowLabel(d.key === 'u' ? a.post_updated : a.post_date),
    value: <time dateTime={d.dt}>{d.text}</time>,
  }))
  if ((pm?.categories ?? true) && entry.categories.length > 0) {
    rows.push({ key: 'categories', label: rowLabel(a.post_categories), value: entry.categories.join(' / ') })
  }
  const span = workPart(entry).period ?? null
  if (span) rows.push({ key: 'period', label: rowLabel(a.case_period), value: span })
  return rows
}

/**
 * 侧栏标签胶囊：与元信息行同一份标签（作品以 blog.work_tag 打头），同样受 post_meta.post.tags 管。
 *
 * @param entry 文章事实。
 * @param site 整份站点数据。
 * @example
 * <ArticleAside tags={articleAsideTags(entry, site)}>
 */
export function articleAsideTags(entry: ArticleEntry, site: SiteData): string[] {
  return (site.post_meta?.post?.tags ?? true) ? articleTags(entry, site) : []
}

/**
 * 顶部槽（两型同源）：**有视频出视频 → 有图出图 → 都没有就不出**（缺省即隐藏，不留空壳）。
 *
 * 作品的载体是视频 / 封面图，博文是 top_img——但规则只有这一条：`top_img` 已在构建期含
 * 「缺省回落 cover」与「显式 false 关闭」的三态处理，故两型都读它即可。
 * 视频播放失败由 VideoHero 兜底换封面图；封面也没有时不渲染任何东西。
 *
 * @param entry 文章事实。
 * @example
 * {articleHero(entry)}
 */
export function articleHero(entry: ArticleEntry): ReactNode {
  const video = workPart(entry).video
  if (video?.src) {
    return (
      <div className="bd-hero">
        <VideoHero
          src={video.src}
          poster={video.poster}
          cover={entry.top_img}
          controls={video.controls === true}
          label={video.caption}
          title={entry.title}
        />
      </div>
    )
  }
  if (!entry.top_img) return null
  return (
    <figure className="bd-hero">
      {/* 顶图是装饰（标题已经给了名字），alt 留空免读屏重复念一遍 */}
      <img src={entry.top_img} alt="" decoding="async" />
    </figure>
  )
}

/**
 * 正文之前的块（两型同源）：第三方嵌入 + 外链——两样都没有就整块不出。
 *
 * @param entry 文章事实。
 * @param site 整份站点数据（读 a11y 的分节标题）。
 * @example
 * {articlePreBody(entry, site)}
 */
export function articlePreBody(entry: ArticleEntry, site: SiteData): ReactNode {
  const w = workPart(entry)
  const embeds = w.embeds ?? []
  const links = w.links ?? []
  if (embeds.length === 0 && links.length === 0) return null
  return (
    <>
      {embeds.length > 0 ? (
        <div className="embeds">
          {site.a11y.case_embeds ? <h2>{site.a11y.case_embeds}</h2> : null}
          <ul>
            {embeds.map((e) => (
              <li key={e.url}>
                <iframe
                  src={e.url}
                  title={e.label}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  // 默认拒绝 allow-top-navigation（防被嵌页把整站顶走）；播放器所需能力显式放行
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {links.length > 0 ? (
        <ul className="ext-links">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

/**
 * 正文之后的块（两型同源）：版权模块 + 评论挂载点——两道开关都在构建期解析成有效值，
 * 没开就都不出（评论还需站点配好 provider）。
 *
 * @param entry 文章事实。
 * @param site 整份站点数据（读 a11y 的行标签与评论 provider）。
 * @example
 * {articlePostBody(entry, site)}
 */
export function articlePostBody(entry: ArticleEntry, site: SiteData): ReactNode {
  const a = site.a11y
  const provider = site.comments?.provider ?? null
  const comments = entry.comments && provider
  if (!entry.copyright && !comments) return null
  return (
    <>
      {entry.copyright ? (
        <PostCopyright
          data={entry.copyright}
          labels={{
            heading: a.post_copyright_heading,
            author: a.post_copyright_author,
            link: a.post_copyright_link,
            notice: a.post_copyright_notice,
          }}
        />
      ) : null}
      {comments ? <section className="post-comments" data-provider={provider} aria-label={a.post_comments_label} /> : null}
    </>
  )
}
