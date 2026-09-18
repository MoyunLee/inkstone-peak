import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { fill, useHeatmapData } from './useHeatmapData'
import type { HeatItem, HeatLabels } from './useHeatmapData'
import { HeatmapGrid } from './HeatmapGrid'
import { HeatmapTooltip } from './HeatmapTooltip'
import type { HeatTip } from './HeatmapTooltip'

export type { HeatItem, HeatLabels } from './useHeatmapData'

/**
 * 贡献日历热力图（/blog 归档页与首页「造境」段共用）。
 *
 * 只读 props：组件不 import content / site 数据，喂 items + labels 即可复用。
 * 悬浮提示只对「年内已过日」出，未来日与跨年留白日不出。
 *
 * @param items 原始条目（date 需 YYYY-MM-DD，count 为当日数量）。
 * @param labels 全部可见文案（唯一家 = site.yml 的 heatmap 段）。
 * @param years 年份页签；省略则由数据年份 + 今年自动推导。
 * @param defaultYear 初始选中年份；缺省为今年。
 * @param className 追加到根节点的类名。
 * @example
 * <Heatmap items={heatItems} labels={site.heatmap} />
 */
export default function Heatmap({
  items,
  labels,
  years: yearsProp,
  defaultYear,
  className = '',
}: {
  items: HeatItem[]
  labels: HeatLabels
  years?: number[]
  defaultYear?: number
  className?: string
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<HeatTip | null>(null)
  const { years, activeYear, setPicked, model } = useHeatmapData({ items, labels, years: yearsProp, defaultYear })

  const onOver = (e: MouseEvent<HTMLDivElement>): void => {
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

  return (
    <section
      className={`heat${className !== '' ? ' ' + className : ''}`}
      data-cols={String(model.colsCount)}
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
      <div className="heat-body" ref={bodyRef} onMouseOver={onOver} onMouseLeave={() => setTip(null)}>
        <HeatmapGrid cols={model.cols} weekdays={labels.weekdays} onScroll={() => setTip(null)} />
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
