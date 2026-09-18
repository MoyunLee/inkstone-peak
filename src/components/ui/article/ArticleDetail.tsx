import type { CSSProperties, ReactNode } from 'react'
import type { ArticleEntry } from '../../../lib/types/content'
import Header from '../../layout/Header'
import SiteFooter from '../../sections/SiteFooter'
import PostBody from '../blog/PostBody'
import PostToc from '../blog/PostToc'
import { useSite } from '../../../lib/data/site'

/** 目录落位：关目录 → null；侧栏开着且非简洁模式 → 侧栏；否则正文内联（关侧栏时目录仍可达）。 */
export function tocPlacement(entry: ArticleEntry): 'aside' | 'inline' | null {
  if (!entry.toc) return null
  return entry.aside && !entry.toc_style_simple ? 'aside' : 'inline'
}

/**
 * 详情页共用外壳（作品 / 博文同构）：主题变量注入 · .bd-layout 骨架 · 标题 · 目录落位 · 正文 · 侧栏。
 *
 * 页面只提供各自的内容配方（下面的槽位），骨架与规则只此一份——避免两套详情页各自硬编码后互相漂移。
 * 目录落位由 tocPlacement() 算：侧栏开着走侧栏，否则内联到正文上方，关目录时为 null。
 *
 * @param entry 文章事实（两型通用，含主题色与目录清单）。
 * @param hero 顶部槽：博文=top_img 大图；作品=视频/封面。
 * @param lead 标题下首行（作品=description 提要）。
 * @param meta 元信息行（博文=日期/分类/标签；作品=周期）。
 * @param preBody 正文之前的块（作品=嵌入 / 外链等）。
 * @param postBody 正文之后的块（博文=版权 / 评论）。
 * @param renderAside 侧栏渲染函数；目录节点由外壳算好传入，落位不在侧栏时传 null。
 * @example
 * <ArticleDetail
 *   entry={b}
 *   hero={<img src={b.top_img ?? ''} alt="" />}
 *   renderAside={(toc) => <ArticleAside lead={site.site.author} rows={rows}>{toc}</ArticleAside>}
 * />
 */
export default function ArticleDetail({
  entry,
  hero,
  lead,
  meta,
  preBody,
  postBody,
  renderAside,
}: {
  entry: ArticleEntry
  /** 顶部槽：博文=top_img 大图；作品=视频/封面。 */
  hero?: ReactNode
  /** 标题下首行（作品=description 提要）。 */
  lead?: ReactNode
  /** 元信息行（博文=日期/分类/标签；作品=周期）。 */
  meta?: ReactNode
  /** 正文之前的块（作品=职责/流程/前后对比/成果/复盘/嵌入/外链）。 */
  preBody?: ReactNode
  /** 正文之后的块（博文=版权/评论）。 */
  postBody?: ReactNode
  /** 侧栏内容；目录节点由外壳按落位算好传入（落位不在侧栏时为 null）。 */
  renderAside: (toc: ReactNode) => ReactNode
}) {
  const site = useSite()
  const a = site.a11y
  const isWork = entry.kind === 'work'
  const style: CSSProperties = {}
  if (entry.main_color) Object.assign(style, { '--post-accent': entry.main_color })
  if (entry.background) style.background = entry.background
  const where = tocPlacement(entry)
  const tocProps = { items: entry.tocItems, number: entry.toc_number, simple: entry.toc_style_simple, label: a.post_toc_label }
  return (
    <>
      <Header />
      <main
        id="main-content"
        className={'page-pad page-main ' + (isWork ? 'portfolio-detail' : 'blog-detail')}
        style={style}
        data-toc-number={entry.toc_number ? 'true' : 'false'}
      >
        {hero}
        <div className="bd-layout" data-aside={entry.aside ? 'true' : 'false'}>
          <article className="bd-main">
            <h1>{entry.title}</h1>
            {lead}
            {meta}
            {/* 标题区（标题/摘要/元信息）之下压线，题头成块、正文另起 */}
            <div className="bd-rule" aria-hidden="true" />
            {where === 'inline' ? <PostToc {...tocProps} variant="inline" /> : null}
            {preBody}
            <PostBody
              html={entry.bodyHtml}
              shrink={entry.highlight_shrink}
              expandLabel={a.post_code_expand}
              collapseLabel={a.post_code_collapse}
              math={entry.mathjax ? 'mathjax' : entry.katex ? 'katex' : null}
              aplayer={entry.aplayer}
            />
            {postBody}
          </article>
          {entry.aside ? (
            <aside className="post-aside" aria-label={isWork ? a.case_aside_label : a.post_aside_label}>
              {renderAside(where === 'aside' ? <PostToc {...tocProps} variant="aside" /> : null)}
            </aside>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
