/* /about 第三行右（占 1 列）：坐标「我现在住在」，极简水墨线条城市剪影（行内 SVG）。 */
import { MapPin } from 'lucide-react'
import { placeNote } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'

export default function PlaceCard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  const note = placeNote(site)
  return (
    <div className={`bento-card bento-place ${className}`.trim()}>
      {b.label_place ? <small className="bento-label">{b.label_place}</small> : null}
      {b.title_place ? <h2 className="bento-card-title">{b.title_place}</h2> : null}
      {/* 自适应插画槽：吃满标题与配文之间的剩余高度，画面贴底随槽缩放 */}
      <div className="bento-city-slot">
        <svg className="bento-city" viewBox="0 0 240 78" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
          {/* 天际线：一条地平线 + 高低楼群 + 两处坡屋顶（单描边、无填充） */}
          <path d="M0 66h240" />
          <path d="M14 66V46h16v20" />
          <path d="M11 46l11-8 11 8" />
          <path d="M44 66V28h18v38" />
          <path d="M72 66V50h12v16" />
          <path d="M94 66V38h24v28" />
          <path d="M128 66V22h9v44" />
          <path d="M147 66V44h28v22" />
          <path d="M185 66V52h14v14" />
          <path d="M206 66V34h22v32" />
          <path className="bento-city-mist" d="M4 73q28-5 56-5t56 5 56 5 60-6" />
        </svg>
      </div>
      {note || b.place_avail ? (
        <div className="bento-place-meta">
          {note ? (
            <p className="bento-place-note">
              <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />
              {note}
            </p>
          ) : null}
          {b.place_avail ? <p className="bento-place-avail">{b.place_avail}</p> : null}
        </div>
      ) : null}
      {b.place_coord ? <p className="bento-place-coord">{b.place_coord}</p> : null}
    </div>
  )
}
