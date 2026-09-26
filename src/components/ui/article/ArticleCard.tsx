import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleEntry } from '../../../lib/types/content'
import RespImg from '../RespImg'
import Seal from '../Seal'

/** 占位色块轮换数：须与 arc.css 的 .cover-ph[data-tone='0..4'] 五档一致（改色只改 CSS）。 */
export const COVER_TONES = 5

/**
 * 文章卡（全站唯一一张，2026-09-20 统一）：/blog 归档网格与 /portfolio 瀑布流共用本组件、同一套槽位——
 * 封面 → 标题 → 提要 → 标签 → 日期（**有 updated 就出 updated，否则回落发布日**）。
 * 日期是**结构元素**：不受任何 site.yml 开关管，恒出（原 blog.show_date 已于 2026-09-20 退役）。
 *
 * 两页剩下的差别只有**容器几何**：/blog 走 .arc-grid（1/2/3 列等宽网格），/portfolio 走 .portfolio
 * （两列瀑布流、偶数卡封面 4:3）——几何归容器（arc.css / portfolio.css），槽位与皮肤归本组件。
 *
 * 无封面时走 .cover-ph 色块占位（皮肤在 arc.css，五档 tone 由调用方按下标轮换）。
 *
 * @param entry 文章事实（作品 / 博文同一契约）。
 * @param sizes 封面容器几何口径（CARD_SIZES_2 / CARD_SIZES_3）——卡片几何归容器，故由网格组件给。
 * @param index 列表序号 → 挂成 --i，供列表页进场级联的阶梯延迟；首页各段不挂该 CSS，故无副作用。
 * @param tone 无封面时的色块档位（0..COVER_TONES-1）。
 * @param tagsMax 标签上限；0 或省略 = 不限。
 * @param workTag 作品的中文标签（唯一家 = site.yml blog.work_tag）；只在归档网格里传。
 * @example
 * <ArticleCard entry={w} sizes={CARD_SIZES_2} index={i} tone={i % COVER_TONES} />
 * <ArticleCard entry={a} sizes={CARD_SIZES_3} tagsMax={cfg?.tags_max} workTag={workTag} />
 */
export default function ArticleCard({
  entry,
  sizes,
  tone = 0,
  tagsMax = 0,
  workTag = '',
  index,
}: {
  entry: ArticleEntry
  /** 封面容器几何口径（CARD_SIZES_2 / CARD_SIZES_3）——卡片几何归容器，故由网格组件给。 */
  sizes: string
  /** 列表内的序号 → 挂成 --i，供「列表页进场级联」的阶梯延迟（首页各段不挂该 CSS，故无副作用）。 */
  index?: number
  /** 无封面时的色块档位（0..4）；由调用方按序轮换。 */
  tone?: number
  /** 标签上限；0 或省略 = 不限量。 */
  tagsMax?: number
  /** 作品在归档卡上的显示标签（中文唯一家 = site.yml blog.work_tag）。 */
  workTag?: string
}) {
  const rise = index === undefined ? undefined : ({ ['--i']: index } as CSSProperties)
  // 类型标记是分流指令、构建期已从 tags 里剔除，故此处直接展示；作品改用 site.yml 的中文标签打头
  const own = entry.tags
  const all = entry.kind === 'work' && workTag ? [workTag, ...own] : own
  const tags = tagsMax > 0 ? all.slice(0, tagsMax) : all
  // 日期取「最后更新」优先：updated 缺省才回落发布日（站内无历史版本，「改过几次」不可知）
  const stamp = entry.updated ?? entry.date
  return (
    <Link to={entry.to} className="card" style={rise}>
      {entry.cover ? (
        <span className="card-cover">
          {/* 封面是装饰（卡的链接名由标题文字给），故 alt 留空，免读屏重复念一遍 */}
          <RespImg src={entry.cover} sizes={sizes} />
        </span>
      ) : (
        <span className="card-cover cover-ph" data-tone={String(tone)} aria-hidden="true">
          <Seal variant="mark" />
        </span>
      )}
      <div className="card-body">
        <h3 className="card-title">{entry.title}</h3>
        {entry.description ? <p className="card-desc">{entry.description}</p> : null}
        {tags.length > 0 ? (
          <ul className="card-tags">
            {tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}
        <time className="card-date" dateTime={stamp}>
          {stamp}
        </time>
      </div>
    </Link>
  )
}
