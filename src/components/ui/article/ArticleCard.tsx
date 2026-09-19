import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleEntry } from '../../../lib/types/content'
import Seal from '../Seal'

/** 占位色块轮换数：须与 arc.css 的 .cover-ph[data-tone='0..4'] 五档一致（改色只改 CSS）。 */
export const COVER_TONES = 5

/**
 * 文章卡：一个组件、两个皮肤——链接落点（entry.to）与封面回落只在这里写一份。
 *
 * - `arc`  = 归档卡 / 首页造境段（.arc-card：封面或五档色块 + 标题 + 标签 + 日期）
 * - `case` = 观山卡 / 首页观山段（.card：封面或五档色块 + 标题 + 提要）
 *
 * 无图占位两皮肤共用 .cover-ph（arc.css），几何各随所在容器。
 *
 * @param entry 文章事实（两型通用）。
 * @param skin 皮肤：'arc' | 'case'。
 * @param index 列表序号 → 挂成 --i，供列表页进场级联的阶梯延迟；首页段不挂该 CSS，故无副作用。
 * @param tone 无封面时的色块档位（0..COVER_TONES-1）。
 * @param date arc 皮肤是否渲染日期。
 * @param tagsMax arc 皮肤标签上限；0 或省略 = 不限。
 * @param workTag 作品在归档卡上的中文标签（唯一家 = site.yml blog.work_tag）。
 * @example
 * <ArticleCard entry={w} skin="case" index={i} tone={i % COVER_TONES} />
 */
export default function ArticleCard({
  entry,
  skin,
  tone = 0,
  date = false,
  tagsMax = 0,
  workTag = '',
  index,
}: {
  entry: ArticleEntry
  skin: 'arc' | 'case'
  /** 列表内的序号 → 挂成 --i，供「列表页进场级联」的阶梯延迟（首页各段不挂该 CSS，故无副作用）。 */
  index?: number
  /** 无封面时的色块档位（0..4）；两皮肤共用 .cover-ph 皮肤，由调用方按序轮换。 */
  tone?: number
  date?: boolean
  tagsMax?: number
  /** 作品在归档卡上的显示标签（中文唯一家 = site.yml blog.work_tag）。 */
  workTag?: string
}) {
  const rise = index === undefined ? undefined : ({ ['--i']: index } as CSSProperties)
  if (skin === 'case') {
    return (
      <Link to={entry.to} className="card" style={rise}>
        {entry.cover ? (
          <span className="cover">
            <img src={entry.cover} alt={entry.title} loading="lazy" decoding="async" />
          </span>
        ) : (
          <span className="cover cover-ph" data-tone={String(tone)} aria-hidden="true">
            <Seal variant="mark" />
          </span>
        )}
        <h3>{entry.title}</h3>
        {entry.description ? <p>{entry.description}</p> : null}
      </Link>
    )
  }
  // 类型标记是分流指令、构建期已从 tags 里剔除，故此处直接展示；作品改用 site.yml 的中文标签打头
  const own = entry.tags
  const all = entry.kind === 'work' && workTag ? [workTag, ...own] : own
  const tags = tagsMax > 0 ? all.slice(0, tagsMax) : all
  return (
    <Link to={entry.to} className="arc-card" style={rise}>
      {entry.cover ? (
        <span className="arc-cover arc-cover-img">
          <img src={entry.cover} alt="" loading="lazy" decoding="async" />
        </span>
      ) : (
        <span className="arc-cover cover-ph" data-tone={String(tone)} aria-hidden="true">
          <Seal variant="mark" />
        </span>
      )}
      <div className="arc-body">
        <h3 className="arc-title">{entry.title}</h3>
        <ul className="arc-tags">
          {tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {date ? <time className="arc-date">{entry.date}</time> : null}
      </div>
    </Link>
  )
}
