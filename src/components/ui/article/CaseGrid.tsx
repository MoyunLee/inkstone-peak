import { useRef } from 'react'
import type { WorkArticle } from '../../../lib/types/content'
import { CARD_SIZES_2 } from '../../../lib/data/images'
import { useMasonry } from '../../../lib/hooks/useMasonry'
import ArticleCard, { COVER_TONES } from './ArticleCard'

/**
 * 观山网格：响应式两列瀑布流，/portfolio 列表页与首页观山段共用（卡片＝全站唯一的 ArticleCard；几何差异由 page 决定）。
 *
 * 卡片按序轮换五档占位色；序号封顶 12——--i 的进场阶梯延迟不再随列表长度增长。
 *
 * @param items 已排序的作品清单。
 * @param page true=列表页版心（.portfolio-page）；false=首页段。
 * @example
 * <CaseGrid items={works} />
 * <CaseGrid items={works} page />
 */
export default function CaseGrid({ items, page = false }: { items: WorkArticle[]; page?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useMasonry(ref)
  return (
    <div className={page ? 'portfolio portfolio-page' : 'portfolio'} ref={ref}>
      {items.map((w, i) => (
        <ArticleCard key={w.slug} entry={w} sizes={CARD_SIZES_2} index={Math.min(i, 12)} tone={i % COVER_TONES} />
      ))}
    </div>
  )
}
