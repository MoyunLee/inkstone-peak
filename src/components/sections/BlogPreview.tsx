/* 首页 S3 造境段——与 /blog 归档页同用 ArticleGrid，只多一个 limit。 */
import Section from '../layout/Section'
import ArticleGrid from '../ui/article/ArticleGrid'
import Heatmap from '../ui/heatmap'
import { articles, heatItems } from '../../lib/data/content'
import { sectionById, useSite } from '../../lib/data/site'

export default function BlogPreview() {
  const site = useSite()
  const sec = sectionById(site, 'blog')
  if (!sec) return null
  return (
    <Section sec={sec}>
      {site.heatmap ? <Heatmap items={heatItems} labels={site.heatmap} /> : null}
      {/* limit=真截断：超出的不进 DOM，首页不随文章变多而拉长。 */}
      <ArticleGrid entries={articles} cfg={site.blog} limit={site.blog?.preview_max ?? 6} workTag={site.blog?.work_tag} />
    </Section>
  )
}
