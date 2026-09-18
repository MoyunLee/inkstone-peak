/* /about 第二行右（占 1 列）：生涯「无限进步」垂直时间轴。 */
import { careerNodes } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'

export default function CareerCard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  return (
    <div className={`bento-card bento-career ${className}`.trim()}>
      {b.label_career ? <small className="bento-label">{b.label_career}</small> : null}
      {b.title_career ? <h2 className="bento-card-title">{b.title_career}</h2> : null}
      <ol className="bento-timeline" aria-label={site.a11y.about_timeline_label}>
        {careerNodes(site).map((n) => (
          <li key={n.period} className="bento-node">
            <span className="bento-node-dot" aria-hidden="true" />
            <span className="bento-node-period">{n.period}</span>
            <span className="bento-node-text">{n.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
