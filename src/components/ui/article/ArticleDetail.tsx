import type { CSSProperties } from 'react'
import type { ArticleEntry } from '../../../lib/types/content'
import Header from '../../layout/Header'
import SiteFooter from '../../sections/SiteFooter'
import PostBody from '../blog/PostBody'
import PostToc from '../blog/PostToc'
import ArticleAside from './ArticleAside'
import {
  articleAsideRows,
  articleAsideTags,
  articleHero,
  articleMeta,
  articlePostBody,
  articlePreBody,
} from './articleRecipe'
import { useSite } from '../../../lib/data/site'

/** 目录落位：关目录 → null；侧栏开着且非简洁模式 → 侧栏；否则正文内联（关侧栏时目录仍可达）。 */
export function tocPlacement(entry: ArticleEntry): 'aside' | 'inline' | null {
  if (!entry.toc) return null
  return entry.aside && !entry.toc_style_simple ? 'aside' : 'inline'
}

/**
 * 详情页外壳——**作品 / 博文只有这一个**（2026-09-21 统一）：主题变量注入 · 顶图槽 · .bd-layout 骨架 ·
 * 标题区（标题 / 回落的元信息行）· 侧栏（信息卡 + 卡外目录）· 正文 · 嵌入槽 · 版权槽。
 *
 * 内容全由 articleRecipe 按文章数据算（题头 / 侧栏 / 顶图 / 嵌入 / 版权 / 评论），本组件只按顺序落位、
 * **不认识 kind**；页面因此只剩「取哪一篇」（postBySlug / workBySlug）+ 取不到走 404。
 * 目录落位由 tocPlacement() 算：侧栏开着走侧栏，否则内联到正文上方，关目录时为 null。
 *
 * @param entry 文章事实（两型同一契约，含主题色与目录清单）。
 * @example
 * const b = postBySlug(slug)
 * if (!b) return <NotFound />
 * return <ArticleDetail entry={b} />
 */
export default function ArticleDetail({ entry }: { entry: ArticleEntry }) {
  const site = useSite()
  const a = site.a11y
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
        className="page-pad page-main"
        style={style}
        data-toc-number={entry.toc_number ? 'true' : 'false'}
      >
        {articleHero(entry, site)}
        {/* DOM 顺序恒为「标题区 → 侧栏 → 正文」：窄屏单列时正是想要的阅读顺序（标题 → 信息卡与目录 → 正文），
            宽屏靠 .bd-layout 的命名栅格区把侧栏整列右移（见 post.css）。 */}
        <article className="bd-layout" data-aside={entry.aside ? 'true' : 'false'}>
          <div className="bd-head">
            <h1>{entry.title}</h1>
            {/* 元信息只有侧栏一处（关掉侧栏才回落到标题下）——两处同时出就是重复 */}
            {entry.aside ? null : articleMeta(entry, site)}
            {/* 标题区（标题 / 回落的元信息行）之下压线，题头成块、正文另起 */}
            <div className="bd-rule" aria-hidden="true" />
          </div>
          {entry.aside ? (
            <aside className="post-aside" aria-label={a.post_aside_label}>
              <ArticleAside
                author={site.site.author}
                desc={entry.description}
                rows={articleAsideRows(entry, site)}
                tags={articleAsideTags(entry, site)}
              >
                {where === 'aside' ? <PostToc {...tocProps} variant="aside" /> : null}
              </ArticleAside>
            </aside>
          ) : null}
          <div className="bd-body">
            {where === 'inline' ? <PostToc {...tocProps} variant="inline" /> : null}
            {articlePreBody(entry, site)}
            <PostBody
              html={entry.bodyHtml}
              shrink={entry.highlight_shrink}
              expandLabel={a.post_code_expand}
              collapseLabel={a.post_code_collapse}
              math={entry.mathjax ? 'mathjax' : entry.katex ? 'katex' : null}
              aplayer={entry.aplayer}
            />
            {articlePostBody(entry, site)}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}
