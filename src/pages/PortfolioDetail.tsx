/* /portfolio/:slug 案例页。2026-09-21 统一壳子：骨架与内容全交给 ArticleDetail（配方在 articleRecipe），
   本页只剩一件事——按 slug 取作品，取不到走 404（博文在 /portfolio/:slug 恒 404，类型分流在数据层）。 */
import { useParams } from 'react-router-dom'
import ArticleDetail from '../components/ui/article/ArticleDetail'
import { workBySlug } from '../lib/data/content'
import NotFound from './NotFound'

export default function PortfolioDetail() {
  const { slug } = useParams()
  const w = workBySlug(slug)
  if (!w) return <NotFound />
  return <ArticleDetail entry={w} />
}
