/* /portfolio/:slug 案例页。统一壳子：骨架与内容全交给 ArticleDetail（配方在 articleRecipe），
   本页只剩两件事——按 slug 取作品（取不到走 404），以及把「上一件 / 下一件」按 works 的下标算好接线进去。
   作品导航的数据（相邻关系）住这里、不住 ArticleDetail：后者**不认识 kind**（见其文件头注释）。 */
import { useParams } from 'react-router-dom'
import ArticleDetail from '../components/ui/article/ArticleDetail'
import WorkNav from '../components/ui/article/WorkNav'
import { workBySlug, works } from '../lib/data/content'
import NotFound from './NotFound'

export default function PortfolioDetail() {
  const { slug } = useParams()
  const w = workBySlug(slug)
  if (!w) return <NotFound />
  // 相邻件取 works 的**下标**，严禁改用 .content/posts.json 的数组下标：
  // 前者是列表页同序的那一份（置顶组 → 组内索引 → 日期倒序），有置顶作品时两者会分叉。
  const i = works.indexOf(w)
  const prev = i > 0 ? (works[i - 1] ?? null) : null
  const next = i >= 0 && i < works.length - 1 ? (works[i + 1] ?? null) : null
  return <ArticleDetail entry={w} afterBody={<WorkNav prev={prev} next={next} />} />
}
