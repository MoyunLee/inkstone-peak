import type { CSSProperties } from 'react'
import type { HeatCol } from './useHeatmapData'

/**
 * 热力图网格：月份表头 + 星期列（只显奇数行）+ 方块网格。
 *
 * 方块只作视觉编码，合计由标题与 aria-label 承载，故整图 aria-hidden（读屏不会逐格朗读）。
 * 可点（`pickable`）时同样不给方块加角色 / 焦点：**整图仍是障眼图层**，
 * 点击只是给指针用户的近路——同一份事实在下方年表里逐条可读、可 Tab（渐进增强，见 heat.css 那段）。
 *
 * 生长进画：每周外包一层 `.heat-col`（display:contents，不生成盒子）只为挂 `--heat-i`，
 * 行列错开的补间住 heat.css；触发权在 index.tsx 的 useReveal，属性在段根上。
 *
 * @param cols 列模型，每列 7 天。
 * @param weekdays 星期名（长度 7，周日起）；只渲染下标为奇数的行。
 * @param onScroll 横向滚动回调，父组件用它收起提示。
 * @param pickable true = 给「年内已过日且当日有条目」的格子出光标与悬停回执（`data-pick`）。
 * @param picked 已选中那一天（`YYYY-MM-DD`）→ 该格写 `data-picked`。
 * @example
 * <HeatmapGrid cols={model.cols} weekdays={labels.weekdays} onScroll={() => setTip(null)} pickable picked={day} />
 */
export function HeatmapGrid({
  cols,
  weekdays,
  onScroll,
  pickable = false,
  picked = null,
}: {
  cols: HeatCol[]
  weekdays: string[]
  onScroll: () => void
  /** true = 可点的那几格写 `data-pick`（没有去处的格子不写，免得光标骗人）。 */
  pickable?: boolean
  /** 选中的那一天。 */
  picked?: string | null
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
            {cols.map((col, ci) => (
              <div key={col.key} className="heat-col" style={{ ['--heat-i']: ci } as CSSProperties}>
                {col.days.map((day) => (
                  <span
                    key={day.key}
                    className="heat-cell"
                    data-level={String(day.level)}
                    data-state={day.state}
                    data-heat-day={day.key}
                    data-heat-count={String(day.count)}
                    data-pick={pickable && day.state === 'day' && day.count > 0 ? 'true' : undefined}
                    data-picked={day.key === picked ? 'true' : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
