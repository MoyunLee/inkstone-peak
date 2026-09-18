import { useId } from 'react'
import { useSite } from '../../lib/data/site'

const CHIPS: [number, number, number][] = [
  [1.5, 7, 3],
  [42.5, 3.5, 2.4],
  [43, 31, 1.8],
  [12, 43, 2.6],
  [34, 1, 1.5],
  [1, 35, 1.3],
  [30.5, 12, 1],
  [9, 27, 0.9],
]

/**
 * 印章母版：顶栏徽章、页脚大印、观自顶印与封面占位水印共用这一枚（白文方印 + 崩口 mask + 竖排印文）。
 *
 * 印文取 site.yml 的 `footer.seal_text`，只取前两个字；尺寸真源在 CSS 变体类里，width/height 仅作无 CSS 时的兜底。
 * **SVG mask 的 id 必须来自 useId()**：同一页面多处渲染会撞 id，导致崩口 mask 串位。
 *
 * @param variant 呈现变体——badge=顶栏 / foot=页脚大印（CSS 里 -4° 倾斜）/ about=顶部居中印 / mark=封面占位水印。
 * @example
 * <Seal />                 // 顶栏徽章（默认）
 * <Seal variant="foot" />  // 页脚大印
 */
export default function Seal({ variant = 'badge' }: { variant?: 'badge' | 'foot' | 'about' | 'mark' }) {
  const site = useSite()
  const maskId = useId()
  const chars = Array.from(site.footer.seal_text)
  // 尺寸真源在 CSS 各类名下，width/height 只作无 CSS 时的兜底
  const px = variant === 'badge' || variant === 'mark' ? undefined : 96
  const cls = variant === 'badge' ? 'badge-seal' : variant === 'foot' ? 'big-seal' : variant === 'about' ? 'about-seal' : 'cover-seal'
  return (
    <svg
      className={cls}
      width={px ?? 40}
      height={px ?? 40}
      viewBox="0 0 44 44"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={maskId}>
          <rect width="44" height="44" fill="#fff" />
          {CHIPS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#000" />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d="M6 2h32q4 0 4 4v32q0 4-4 4H6q-4 0-4-4V6q0-4 4-4z" fill="var(--seal)" />
        <rect x="5.5" y="5.5" width="33" height="33" fill="none" stroke="var(--paper)" strokeOpacity=".45" strokeWidth=".9" />
        {chars[0] ? (
          <text x="22" y="21" fontSize="15" fill="var(--paper)" textAnchor="middle" style={{ fontFamily: 'var(--font-kai)' }}>
            {chars[0]}
          </text>
        ) : null}
        {chars[1] ? (
          <text x="22" y="36.5" fontSize="15" fill="var(--paper)" textAnchor="middle" style={{ fontFamily: 'var(--font-kai)' }}>
            {chars[1]}
          </text>
        ) : null}
      </g>
    </svg>
  )
}
