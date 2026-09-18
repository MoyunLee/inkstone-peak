/* /about 第三行左（占 2 列）：数据「游戏阅历与拆解」，2×3 网格。 */
import { gameExperiences } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'

export default function GameStatsCard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  return (
    <div className={`bento-card bento-stats ${className}`.trim()}>
      {b.label_stats ? <small className="bento-label">{b.label_stats}</small> : null}
      {b.title_stats ? <h2 className="bento-card-title">{b.title_stats}</h2> : null}
      <ul className="bento-game-grid">
        {gameExperiences(site).map((g) => (
          <li key={g.name} className="bento-game">
            <span className="bento-game-hours">
              {g.hours}
              {b.hours_unit ? <i>{b.hours_unit}</i> : null}
            </span>
            <span className="bento-game-name">{g.name}</span>
            {g.insight ? (
              <span className="bento-game-insight">{g.insight}</span>
            ) : (
              <span className="bento-game-insight" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
