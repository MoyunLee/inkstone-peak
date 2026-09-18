import { Link } from 'react-router-dom'
import { useSite } from '../../lib/data/site'
import { useNavState } from '../../lib/nav/nav-sync'
import Seal from '../ui/Seal'

/**
 * 顶栏：站点徽章 + 主导航 + 跳到正文的 skip-link。
 *
 * 条目与高亮全部由 site.yml 的 nav 驱动，导航状态与右侧题签（SideTabs）共用 useNavState。
 *
 * @example
 * <Header />
 */
export default function Header() {
  const site = useSite()
  const { active, onClick } = useNavState(site.nav)
  return (
    <header className="topbar">
      {site.a11y.skip_link_label ? (
        <a className="skip-link" href="#main-content">
          {site.a11y.skip_link_label}
        </a>
      ) : null}
      <div className="brand-wrap">
        <Link to="/" className="brand" aria-label={site.a11y.brand_label} title={site.site.title}>
          <Seal variant="badge" />
        </Link>
      </div>
      <nav aria-label={site.a11y.nav_label}>
        {site.nav.map((n, i) => {
          const on = i === active
          return (
            <Link
              key={n.ink}
              className={on ? 'on' : undefined}
              aria-current={on ? 'true' : undefined}
              to={n.route ?? { pathname: '/', hash: '#home' }}
              onClick={(e) => {
                if (onClick(n)) e.preventDefault()
              }}
            >
              {n.ink}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
