import type { ArticleEntry } from '../../../lib/types/content'
import type { BlogCfg } from '../../../lib/types/site'
import ArticleCard, { COVER_TONES } from './ArticleCard'

function pinRank(e: ArticleEntry): [number, number] {
  if (e.swiper_index !== null) return [0, e.swiper_index]
  if (e.top_group_index !== null) return [1, e.top_group_index]
  return [2, 0]
}

/**
 * 归档网格：/blog 列表页与首页造境段共用（卡片＝全站唯一的 ArticleCard，两页同源）。
 *
 * 排序契约：先按 swiper_index 置顶，再按 top_group_index，最后按日期（方向由 cfg.order 决定）；
 * 同组内按索引升序。limit 为真时截断。
 *
 * @param entries 待排序清单（内部会 slice 复制，不改原数组）。
 * @param cfg site.yml 的 blog 段配置（order / show_date / tags_max）。
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
  const asc = cfg?.order === 'asc'
  const sorted = entries.slice().sort((a, b) => {
    const ra = pinRank(a)
    const rb = pinRank(b)
    if (ra[0] !== rb[0]) return ra[0] - rb[0]
    if (ra[0] !== 2 && ra[1] !== rb[1]) return ra[1] - rb[1]
    return asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  })
  const shown = limit !== undefined && limit > 0 ? sorted.slice(0, limit) : sorted
  return (
    <div className="archive">
      <ul className="arc-grid">
        {shown.map((entry, i) => (
          <li key={entry.slug}>
            <ArticleCard
              entry={entry}
              index={Math.min(i, 12)}
              tone={i % COVER_TONES}
              // 归档网格里日期受 site.yml blog.show_date 管（缺省/删＝不出）；观山卡没有这个开关，恒出
              date={cfg?.show_date === true}
              tagsMax={cfg?.tags_max}
              workTag={workTag}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
