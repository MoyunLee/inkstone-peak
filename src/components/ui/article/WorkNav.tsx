import { Link } from 'react-router-dom'
import type { WorkArticle } from '../../../lib/types/content'
import { useSite } from '../../../lib/data/site'

/**
 * 作品详情页的「上一件 / 下一件」导航（同步静态渲染：无 Suspense、无 lazy）。
 *
 * **顺序不认识这里**：相邻关系由调用方按 `works` 的下标算好再传进来（`prev = works[i-1]`、
 * `next = works[i+1]`）——`works` 是 /portfolio 列表页同序的那一份（置顶组 → 组内索引 → 日期倒序，
 * 契约见 lib/data/content 的 compareArticles）。本组件只落位与出文案，故与 ArticleDetail 一样不认识 kind。
 *
 * 首件无「上一件」、末件无「下一件」；两者皆空（作品总数为 1 时）整块不渲染。
 *
 * @param prev 上一件；首件为 null。
 * @param next 下一件；末件为 null。
 * @example
 * const i = works.indexOf(w)
 * <ArticleDetail entry={w} afterBody={<WorkNav prev={works[i - 1] ?? null} next={works[i + 1] ?? null} />} />
 */
export default function WorkNav({ prev, next }: { prev: WorkArticle | null; next: WorkArticle | null }) {
  const a = useSite().a11y
  if (!prev && !next) return null
  return (
    <nav className="case-nav" aria-label={a.case_nav_label}>
      {prev ? (
        <Link className="case-nav-link prev" to={prev.to}>
          {a.case_prev ? <span className="case-nav-key">{a.case_prev}</span> : null}
          <span className="case-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <span className="case-nav-gap" aria-hidden="true" />
      )}
      {next ? (
        <Link className="case-nav-link next" to={next.to}>
          {a.case_next ? <span className="case-nav-key">{a.case_next}</span> : null}
          <span className="case-nav-title">{next.title}</span>
        </Link>
      ) : (
        <span className="case-nav-gap" aria-hidden="true" />
      )}
    </nav>
  )
}
