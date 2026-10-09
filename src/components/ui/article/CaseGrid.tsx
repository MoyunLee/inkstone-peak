import type { WorkArticle } from '../../../lib/types/content'
import { CARD_SIZES_2 } from '../../../lib/data/images'
import { useMasonry } from '../../../lib/hooks/useMasonry'
import { useReveal } from '../../../lib/hooks/useReveal'
import ArticleCard, { COVER_TONES } from './ArticleCard'

/**
 * 观山网格：响应式两列瀑布流，/portfolio 列表页与首页观山段共用（卡片＝全站唯一的 ArticleCard；几何差异由 page 决定）。
 *
 * 卡片按序轮换五档占位色；序号封顶 12——--i 的进场阶梯延迟不再随列表长度增长。
 *
 * 一个 ref 两用：既是瀑布流的量高容器（useMasonry），也是滚动进场的观察目标（useReveal）。
 * threshold 必须给 0——本容器随作品数增长，比例阈值会被超高的目标稀释到永远凑不满（同 Section 的注释）。
 * 进场只动 opacity/transform，而 translateY 不改盒高 ⇒ useMasonry 读出的行轨跨度不受影响（契约见 tokens.css）。
 *
 * @param items 已排序的作品清单。
 * @param page true=列表页版心（.portfolio-page）；false=首页段。
 * @example
 * <CaseGrid items={works} />
 * <CaseGrid items={works} page />
 */
export default function CaseGrid({ items, page = false }: { items: WorkArticle[]; page?: boolean }) {
  const { ref, revealed } = useReveal<HTMLDivElement>({ rootMargin: '0px 0px -12% 0px', threshold: 0 })
  useMasonry(ref)
  return (
    <div
      className={page ? 'portfolio portfolio-page' : 'portfolio'}
      ref={ref}
      data-revealed={revealed ? 'true' : 'false'}
    >
      {items.map((w, i) => (
        <ArticleCard key={w.slug} entry={w} sizes={CARD_SIZES_2} index={Math.min(i, 12)} tone={i % COVER_TONES} />
      ))}
    </div>
  )
}
