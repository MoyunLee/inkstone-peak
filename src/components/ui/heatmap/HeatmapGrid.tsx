import type { HeatCol } from './useHeatmapData'

/**
 * 热力图网格：月份表头 + 星期列（只显奇数行）+ 方块网格。
 *
 * 方块只作视觉编码，合计由标题与 aria-label 承载，故整图 aria-hidden（读屏不会逐格朗读）。
 *
 * @param cols 列模型，每列 7 天。
 * @param weekdays 星期名（长度 7，周日起）；只渲染下标为奇数的行。
 * @param onScroll 横向滚动回调，父组件用它收起提示。
 * @example
 * <HeatmapGrid cols={model.cols} weekdays={labels.weekdays} onScroll={() => setTip(null)} />
 */
export function HeatmapGrid({
  cols,
  weekdays,
  onScroll,
}: {
  cols: HeatCol[]
  weekdays: string[]
  onScroll: () => void
}) {
  return (
    <div className="heat-scroll" onScroll={onScroll}>
      <div className="heat-inner">
        <div className="heat-months" aria-hidden="true">
          {cols.map((col) => (
            <span key={col.key} className="heat-month">
              {col.label}
            </span>
          ))}
        </div>
        <div className="heat-main">
          <div className="heat-weekdays" aria-hidden="true">
            {weekdays.map((w, i) => (
              <span key={w + String(i)} className="heat-weekday">
                {i % 2 === 1 ? w : ''}
              </span>
            ))}
          </div>
          <div className="heat-grid" aria-hidden="true">
            {cols.map((col) =>
              col.days.map((day) => (
                <span
                  key={day.key}
                  className="heat-cell"
                  data-level={String(day.level)}
                  data-state={day.state}
                  data-heat-day={day.key}
                  data-heat-count={String(day.count)}
                />
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
