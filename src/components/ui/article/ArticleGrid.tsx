import { compareArticles } from '../../../lib/data/content'
import { CARD_SIZES_3 } from '../../../lib/data/images'
import { useReveal } from '../../../lib/hooks/useReveal'
import type { ArticleEntry } from '../../../lib/types/content'
import type { BlogCfg } from '../../../lib/types/site'
import ArticleCard, { COVER_TONES } from './ArticleCard'

/**
 * 归档网格：/blog 列表页与首页造境段共用（卡片＝全站唯一的 ArticleCard，两页同源）。
 *
 * 排序契约＝`lib/data/content.ts` 的 `compareArticles()`（**唯一实现**）：先按 swiper_index 置顶，
 * 再按 top_group_index，最后按日期（方向由 cfg.order 决定）；同组内按索引升序。limit 为真时截断。
 *
 * @param entries 待排序清单（内部会 slice 复制，不改原数组）。
 * @param cfg site.yml 的 blog 段配置（order / tags_max）。
 * @param limit 只显示前 N 条；省略或 ≤0 表示不截断。
 * @param workTag 作品在归档卡上的中文标签。
 * @example
 * <ArticleGrid entries={articles} cfg={site.blog} limit={site.blog?.preview_max} workTag={site.blog?.work_tag} />
 */
export default function ArticleGrid({
  entries,
  cfg,
  limit,
  workTag,
}: {
  entries: ArticleEntry[]
  cfg?: BlogCfg
  limit?: number
  workTag?: string
}) {
  // 滚动进场总闸（2026-10-09）：/blog 列表页与首页造境段共用本容器。threshold 给 0 的理由同 Section
  // ——本容器随文章数增长，比例阈值会被稀释到永远凑不满。补间契约见 tokens.css。
  const { ref, revealed } = useReveal<HTMLDivElement>({ rootMargin: '0px 0px -12% 0px', threshold: 0 })
  const sorted = entries.slice().sort((a, b) => compareArticles(a, b, cfg?.order === 'asc' ? 'asc' : 'desc'))
  const shown = limit !== undefined && limit > 0 ? sorted.slice(0, limit) : sorted
  return (
    <div className="archive" ref={ref} data-revealed={revealed ? 'true' : 'false'}>
      <ul className="arc-grid">
        {shown.map((entry, i) => (
          <li key={entry.slug}>
            <ArticleCard
              entry={entry}
              sizes={CARD_SIZES_3}
              index={Math.min(i, 12)}
              tone={i % COVER_TONES}
              tagsMax={cfg?.tags_max}
              workTag={workTag}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
