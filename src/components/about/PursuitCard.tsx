// /about 第一行右（占 1 列）：追求卡，米白底极简边框 + 朱砂高亮段；文案两段住 about 数据，组件不做字符串切割，版式不得改写。
import { useSite } from '../../lib/data/site'

export default function PursuitCard({ className = '' }: { className?: string }) {
  const b = useSite().about
  return (
    <div className={`bento-card bento-pursuit ${className}`.trim()}>
      {b.label_pursuit ? <small className="bento-label">{b.label_pursuit}</small> : null}
      {b.title_pursuit_a || b.title_pursuit_b ? (
        <p className="bento-pursuit-title">
          {b.title_pursuit_a}
          {b.title_pursuit_b ? <em>{b.title_pursuit_b}</em> : null}
        </p>
      ) : null}
    </div>
  )
}
