/* /about 第二行左（占 2 列）：技能「开启创造力」，笔/墨/纸/砚 四组胶囊阵列。 */
import { Clapperboard, Cpu, PenTool, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { skillGroups } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'

const ICON: Record<string, LucideIcon> = {
  brush: PenTool,
  ink: Clapperboard,
  paper: Sparkles,
  inkstone: Cpu,
}

export default function SkillCard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  return (
    <div className={`bento-card bento-skill ${className}`.trim()}>
      {b.label_skill ? <small className="bento-label">{b.label_skill}</small> : null}
      {b.title_skill ? <h2 className="bento-card-title">{b.title_skill}</h2> : null}
      <ul className="bento-skill-groups">
        {skillGroups(site).map((g) => {
          const Icon = ICON[g.id] ?? PenTool
          return (
            <li key={g.id} className="bento-skill-group">
              <h3 className="bento-skill-name">
                <span className="bento-skill-icon" data-tier={g.tier}>
                  <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
                </span>
                {g.title}
              </h3>
              <p className="bento-skill-desc">{g.desc}</p>
              <ul className="bento-pills">
                {g.tools.map((t) => (
                  <li key={t} className="bento-pill">
                    {t}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
