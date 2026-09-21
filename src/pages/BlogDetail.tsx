/* /blog/:slug 文章详情。2026-09-21 统一壳子：骨架与内容全交给 ArticleDetail（配方在 articleRecipe），
   本页只剩一件事——按 slug 取博文，取不到走 404（作品在 /blog/:slug 恒 404，类型分流在数据层）。 */
import { useParams } from 'react-router-dom'
import ArticleDetail from '../components/ui/article/ArticleDetail'
import { postBySlug } from '../lib/data/content'
import NotFound from './NotFound'

export default function BlogDetail() {
  const { slug } = useParams()
  const b = postBySlug(slug)
  if (!b) return <NotFound />
  return <ArticleDetail entry={b} />
}
