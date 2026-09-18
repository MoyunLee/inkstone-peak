import { useMemo, useState } from 'react'

export interface HeatItem {
  date: string
  count: number
}

export interface HeatLabels {
  title: string
  less: string
  more: string
  tip: string
  tip_empty: string
  region_label: string
  years_label: string
  weekdays: string[]
  months: string[]
}

/** 格态：day=年内可悬浮日 / future=年内未来日 / out=跨年留白日（首末列溢出日） */
export type HeatState = 'day' | 'future' | 'out'

export interface HeatDay {
  key: string
  count: number
  level: number
  state: HeatState
}

export interface HeatCol {
  key: string
  label: string
  days: HeatDay[]
}

export interface HeatModel {
  cols: HeatCol[]
  colsCount: number
  total: number
  title: string
}

const DAY_MS = 86400000
const pad2 = (n: number): string => (n < 10 ? '0' + n : String(n))
const keyOf = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

function parseKey(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(y, mo - 1, d)
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null
}

function sundayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - x.getDay())
  return x
}

const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** 把 '{key}' 占位替换成 vars 里的值；缺失的键替成空串。 */
export const fill = (tpl: string, vars: Record<string, string>): string =>
  tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? '')

function aggregate(items: HeatItem[]): { counts: Map<string, number>; dataYears: number[] } {
  const counts = new Map<string, number>()
  const seen = new Set<number>()
  for (const it of items) {
    const d = parseKey(it.date)
    if (!d) continue
    const n = Number.isFinite(it.count) ? it.count : 1
    const k = keyOf(d)
    counts.set(k, (counts.get(k) ?? 0) + n)
    seen.add(d.getFullYear())
  }
  return { counts, dataYears: [...seen].sort((a, b) => b - a) }
}

/**
 * 热力图数据层：把原始条目按日聚合，再按所选自然年铺成 53 / 54 列，并算四档色阶。
 *
 * @param items 原始日期条目。
 * @param labels 文案（title 支持 {n} / {year} 两个占位）。
 * @param years 显式年份页签；省略则用数据年份 + 今年。
 * @param defaultYear 初始选中年份。
 * @returns years=可用年份（倒序）；activeYear=实际生效年份；setPicked=切年；model=铺好的列模型。
 * @example
 * const { years, activeYear, setPicked, model } = useHeatmapData({ items, labels: site.heatmap })
 */
export function useHeatmapData({
  items,
  labels,
  years: yearsProp,
  defaultYear,
}: {
  items: HeatItem[]
  labels: HeatLabels
  years?: number[]
  defaultYear?: number
}): { years: number[]; activeYear: number; setPicked: (y: number) => void; model: HeatModel } {
  const agg = useMemo(() => aggregate(items), [items])

  const years = useMemo(() => {
    const set = new Set<number>(yearsProp ?? [])
    for (const y of agg.dataYears) set.add(y)
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [yearsProp, agg.dataYears])

  const [picked, setPicked] = useState<number>(() => defaultYear ?? new Date().getFullYear())
  const activeYear = years.includes(picked) ? picked : (years[0] ?? picked)

  // 铺所选自然年（周日起自然周）：53 列；闰年且 1/1 是周六时为 54 列
  const model = useMemo<HeatModel>(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start = sundayOf(new Date(activeYear, 0, 1))
    const lastSun = sundayOf(new Date(activeYear, 11, 31))
    const colsCount = Math.round((lastSun.getTime() - start.getTime()) / DAY_MS / 7) + 1
    const cols: HeatCol[] = []
    let total = 0
    let max = 0
    for (let w = 0; w < colsCount; w += 1) {
      const days: HeatDay[] = []
      let firstOfMonth = -1
      for (let r = 0; r < 7; r += 1) {
        const d = addDays(start, w * 7 + r)
        const inYear = d.getFullYear() === activeYear
        const future = inYear && d.getTime() > today.getTime()
        const count = inYear && !future ? (agg.counts.get(keyOf(d)) ?? 0) : 0
        if (inYear && !future) {
          total += count
          if (count > max) max = count
        }
        if (inYear && d.getDate() === 1) firstOfMonth = d.getMonth()
        days.push({ key: keyOf(d), count, level: 0, state: !inYear ? 'out' : future ? 'future' : 'day' })
      }
      cols.push({
        key: `${keyOf(start)}-${w}`,
        label: firstOfMonth < 0 ? '' : (labels.months[firstOfMonth] ?? ''),
        days,
      })
    }
    if (max > 0) {
      for (const col of cols) {
        for (const day of col.days) {
          day.level = day.count <= 0 ? 0 : Math.max(1, Math.ceil((day.count / max) * 4))
        }
      }
    }
    return { cols, colsCount, total, title: fill(labels.title, { n: String(total), year: String(activeYear) }) }
  }, [agg, activeYear, labels])

  return { years, activeYear, setPicked, model }
}
