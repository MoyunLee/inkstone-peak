/* /blog/:slug 文章详情（front-matter 配置系统：顶图 / 目录 / 侧栏 / 版权 / 代码折叠）。
   2026-09-16 统一渲染层：骨架（主题变量 / bd-layout / 标题 / 摘要 / 目录落位 / 正文 / 侧栏）交给
   ArticleDetail；本页只提供「博文」的内容配方。 */
import ArticleAside from '../components/ui/article/ArticleAside'
import type { AsideRow } from '../components/ui/article/ArticleAside'
import ArticleDetail from '../components/ui/article/ArticleDetail'
import PostCopyright from '../components/ui/blog/PostCopyright'
import { useParams } from 'react-router-dom'
import { postBySlug } from '../lib/data/content'
import { useSite } from '../lib/data/site'
import NotFound from './NotFound'

export default function BlogDetail() {
  const { slug } = useParams()
  const site = useSite()
  const a = site.a11y
  const b = postBySlug(slug)
  if (!b) return <NotFound />
  const pm = site.post_meta?.post
  const dateType = pm?.date_type ?? 'both'
  const showTags = pm?.tags ?? true
  const showCategories = pm?.categories ?? true
  const showLabel = pm?.label ?? true
  const provider = site.comments?.provider ?? null
  // date_type: created=只出发布 / updated=只出更新（缺则回落发布）/ both=两者都出
  const dates: { key: string; dt: string; text: string; label?: string }[] = []
  if (dateType === 'updated') {
    dates.push({ key: 'u', dt: b.updated ?? b.date, text: b.updated ?? b.date })
  } else {
    dates.push({ key: 'c', dt: b.date, text: b.date })
    if (dateType === 'both' && b.updated && b.updated !== b.date) {
      dates.push({ key: 'u', dt: b.updated, text: b.updated, label: a.post_updated })
    }
  }
  const hasMeta = dates.length > 0 || (showCategories && b.categories.length > 0) || (showTags && b.tags.length > 0)
  // 侧栏行：日期 / 更新于 / 分类（标签由 ArticleAside 的 tags 槽接管）
  const asideRows: AsideRow[] = [{ key: 'date', label: a.post_date, value: <time dateTime={b.date}>{b.date}</time> }]
  if (b.updated && b.updated !== b.date) {
    asideRows.push({ key: 'updated', label: a.post_updated, value: <time dateTime={b.updated}>{b.updated}</time> })
  }
  if (b.categories.length > 0) {
    asideRows.push({ key: 'categories', label: a.post_categories, value: b.categories.join(' / ') })
  }
  return (
    <ArticleDetail
      entry={b}
      hero={
        b.top_img ? (
          <figure className="bd-hero">
            <img src={b.top_img} alt="" decoding="async" />
          </figure>
        ) : null
      }
      meta={
        hasMeta ? (
          <ul className="bd-meta">
            {dates.map((d) => (
              <li key={d.key}>
                {d.label && showLabel ? `${d.label} ` : ''}
                <time dateTime={d.dt}>{d.text}</time>
              </li>
            ))}
            {showCategories && b.categories.length > 0 ? (
              <li>
                {showLabel && a.post_categories ? `${a.post_categories}：` : ''}
                {b.categories.join(' / ')}
              </li>
            ) : null}
            {showTags ? b.tags.map((t) => <li key={t}>{t}</li>) : null}
          </ul>
        ) : null
      }
      postBody={
        <>
          {b.copyright ? (
            <PostCopyright
              data={b.copyright}
              labels={{
                heading: a.post_copyright_heading,
                author: a.post_copyright_author,
                link: a.post_copyright_link,
                notice: a.post_copyright_notice,
              }}
            />
          ) : null}
          {b.comments && provider ? (
            <section className="post-comments" data-provider={provider} aria-label={a.post_comments_label} />
          ) : null}
        </>
      }
      renderAside={(toc) => (
        <ArticleAside lead={site.site.author} rows={asideRows} tags={b.tags}>
          {toc}
        </ArticleAside>
      )}
    />
  )
}
