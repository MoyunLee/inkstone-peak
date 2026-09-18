// /about 第一行左（占 2 列）：自我介绍深墨卡（var(--ink) 底 + var(--paper) 字，不新增色）。
import { useSite } from '../../lib/data/site'

export default function IntroCard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  return (
    <div className={`bento-card bento-intro-card ${className}`.trim()}>
      {b.label_intro ? <small className="bento-label">{b.label_intro}</small> : null}
      <p className="bento-intro-name">
        {b.intro_lead ? `${b.intro_lead} ` : null}
        <b>{site.site.author}</b>
      </p>
      {b.intro_sub ? <p className="bento-intro-sub">{b.intro_sub}</p> : null}
    </div>
  )
}
