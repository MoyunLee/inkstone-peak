import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { fill, useHeatmapData } from './useHeatmapData'
import type { HeatItem } from './useHeatmapData'
import type { HeatmapLabels } from '../../../lib/types/site'
import { useReveal } from '../../../lib/hooks/useReveal'
import { HeatmapGrid } from './HeatmapGrid'
import { HeatmapTooltip } from './HeatmapTooltip'
import type { HeatTip } from './HeatmapTooltip'

export type { HeatItem } from './useHeatmapData'

/**
 * 贡献日历热力图（/blog 归档页与首页「造境」段共用；2026-10-11 起 /archive 也用它，并多一条「点格子选那天」的近路）。
 *
 * 只读 props：组件不 import content / site 数据，喂 items + labels 即可复用。
 * 悬浮提示只对「年内已过日」出，未来日与跨年留白日不出。
 *
 * 生长进画：触发权交给站内 useReveal（唯一写入方），属性挂在本段根节点上，
 * 补间与逐列错开全住 heat.css —— 首屏就在视口内的热力图（/blog 归档页）直接停在终态、不重播不闪。
 * threshold 给 0 的理由同 Section / ArticleGrid：本段随年份页签与列数增长，比例阈值会被稀释。
 *
 * @param items 原始条目（date 需 YYYY-MM-DD，count 为当日数量）。
 * @param labels 全部可见文案（唯一家 = site.yml 的 heatmap 段）。
 * @param years 年份页签；省略则由数据年份 + 今年自动推导。
 * @param defaultYear 初始选中年份；缺省为今年。
 * @param className 追加到根节点的类名。
 * @param onPickDay 点某一天的格子时回调（`YYYY-MM-DD`）；**省略＝整图不可点**（/blog 与首页就是这样）。
 * @param pickedDay 已选中的那一天，画一圈朱框；缺省无选中。
 * @example
 * <Heatmap items={heatItems} labels={site.heatmap} />
 * <Heatmap items={heatItems} labels={site.heatmap} onPickDay={setDay} pickedDay={day} />
 */
export default function Heatmap({
  items,
  labels,
  years: yearsProp,
  defaultYear,
  className = '',
  onPickDay,
  pickedDay = null,
}: {
  items: HeatItem[]
  labels: HeatmapLabels
  years?: number[]
  defaultYear?: number
  className?: string
  /** 点格子回调；省略即整图不可点（不做「可点但无响应」的空壳）。 */
  onPickDay?: (day: string) => void
  /** 选中的那一天（`YYYY-MM-DD`），只作视觉回执。 */
  pickedDay?: string | null
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<HeatTip | null>(null)
  const { years, activeYear, setPicked, model } = useHeatmapData({ items, labels, years: yearsProp, defaultYear })
  // 生长进画的触发点：整段（题头 + 年份签 + 网格）探进视口才算数；reduced-motion 下 useReveal 恒停终态
  const { ref: revealRef, revealed } = useReveal<HTMLElement>({ rootMargin: '0px 0px -12% 0px', threshold: 0 })

  const onOver = (e: MouseEvent<HTMLDivElement>): void => {
    // 生长途中（约 1s）一律不出提示：那时格子的 rect 还带着缩小 0.7 / 下移 4px 的变换，
    // 而提示锚点正是拿 rect 算的（下面的 cell − body），会浮在缩水的格子上；
    // 且 opacity:0 不挡指针事件，这段窗口里格子照样可悬停 —— 详见 heat.css 第三条铁律的更正。
    if (!revealed) {
      if (tip) setTip(null)
      return
    }
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-heat-day]')
    const body = bodyRef.current
    // 只有「年内已过日」出提示：未来日与跨年溢出日一律不出
    if (!el || !body || el.dataset.state !== 'day') {
      if (tip) setTip(null)
      return
    }
    const box = body.getBoundingClientRect()
    const cell = el.getBoundingClientRect()
    const n = el.dataset.heatCount ?? '0'
    const date = el.dataset.heatDay ?? ''
    setTip({
      text: Number(n) > 0 ? fill(labels.tip, { date, n }) : fill(labels.tip_empty, { date }),
      cx: cell.left - box.left + cell.width / 2,
      cy: cell.top - box.top,
    })
  }

  const pick = (y: number): void => {
    setPicked(y)
    setTip(null)
  }

  /**
   * 点格子选某一天（可选近路）：只有调用方传了 onPickDay 才挂。
   * 命中口径与 onOver 同一套（委托挂在 .heat-body 上、取 `closest('[data-heat-day]')`），
   * 但更严一格：**未来日 / 跨年留白日 / 当日无条目的空白格一律不算命中**——
   * 没有去处就不该有回执（可点的格子另由 HeatmapGrid 写 `data-pick` 出光标）。
   * 生长途中（!revealed）同样不响应：那时格子的 rect 还带着缩放的变换。
   */
  const onDayClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (!onPickDay || !revealed) return
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-heat-day]')
    if (!el || el.dataset.state !== 'day' || Number(el.dataset.heatCount ?? '0') <= 0) return
    onPickDay(el.dataset.heatDay ?? '')
  }

  return (
    <section
      ref={revealRef}
      className={`heat${className !== '' ? ' ' + className : ''}`}
      data-cols={String(model.colsCount)}
      data-revealed={revealed ? 'true' : 'false'}
      aria-label={labels.region_label}
    >
      <div className="heat-head">
        <h2 className="heat-title">{model.title}</h2>
        <div className="heat-years" role="group" aria-label={labels.years_label}>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={y === activeYear ? 'heat-year on' : 'heat-year'}
              aria-pressed={y === activeYear}
              onClick={() => pick(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      <div
        className="heat-body"
        ref={bodyRef}
        onMouseOver={onOver}
        onMouseLeave={() => setTip(null)}
        onClick={onPickDay ? onDayClick : undefined}
      >
        <HeatmapGrid
          cols={model.cols}
          weekdays={labels.weekdays}
          onScroll={() => setTip(null)}
          pickable={onPickDay !== undefined}
          picked={pickedDay}
        />
        <HeatmapTooltip tip={tip} tipRef={tipRef} bodyRef={bodyRef} />
      </div>
      <div className="heat-foot">
        <div className="heat-legend">
          <span className="heat-legend-cap">{labels.less}</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span key={lv} className="heat-cell heat-legend-cell" data-level={String(lv)} />
          ))}
          <span className="heat-legend-cap">{labels.more}</span>
        </div>
      </div>
    </section>
  )
}
