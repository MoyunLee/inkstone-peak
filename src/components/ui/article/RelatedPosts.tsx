import { Link } from 'react-router-dom'
import type { ArticleEntry } from '../../../lib/types/content'
import { relatedTo } from '../../../lib/data/content'
import { useSite } from '../../../lib/data/site'

/**
 * 详情页「相关阅读」（同步静态渲染：无 Suspense、无 lazy）。
 *
 * **相关度不认识这里**：候选与定序全在 lib/data/content 的 relatedTo（tags 交集 → relatedWork 置顶 →
 * 平手走同一份 compareArticles 契约），本组件只落位与出文案——与 ArticleDetail / WorkNav 一样不认识 kind。
 *
 * 无候选（交集为 0 且无 relatedWork 命中）时整块不渲染；标题与可访问名同一枚 a11y.related_title
 * （缺省同样是「缺键即隐藏」，故一并挡住空标题）。
 *
 * @param entry 文章事实（作品 / 博文同一契约）。
 * @example
 * <ArticleDetail entry={b} afterBody={<RelatedPosts entry={b} />} />
 */
export default function RelatedPosts({ entry }: { entry: ArticleEntry }) {
  const label = useSite().a11y.related_title
  const items = relatedTo(entry)
  if (items.length === 0 || !label) return null
  return (
    <section className="related" aria-labelledby="related-title">
      <h2 className="related-title" id="related-title">
        {label}
      </h2>
      <ul className="related-list">
        {items.map((item) => (
          <li key={item.slug}>
            <Link to={item.to}>{item.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
