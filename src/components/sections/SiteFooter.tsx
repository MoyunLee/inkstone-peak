/* S5 传音 · 结构化页脚：大标题复用 home.sections[footer].heading（单一来源）。 */
import { Link, useLocation } from 'react-router-dom'
import type { CSSProperties, MouseEvent } from 'react'
import Seal from '../ui/Seal'
import { pathOf } from '../../lib/nav/nav-sync'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { sectionById, useSite } from '../../lib/data/site'
import type { SiteLink, SocialLink } from '../../lib/types/site'

/** 站内路由判定：外链 / mailto / 带扩展名的静态件（`source/site/` 下的 PDF、图片等）交给原生 <a>，避免被 <Link> 当成路由吞掉。 */
const isInternalPath = (to: string): boolean => {
  if (/^(https?:|mailto:|tel:|#)/.test(to)) return false
  const bare = to.split('#')[0] ?? to
  return !/\.[a-z0-9]{2,5}$/i.test(bare)
}

export default function SiteFooter() {
  const site = useSite()
  const { pathname } = useLocation()
  const isHomeSection = pathname === '/'
  const reduceMotion = useMotionSafe()
  // 命中"本页"时吞掉路由跳转，平滑滚回顶部（reduced-motion 下瞬时）
  const scrollTop = (e: MouseEvent): void => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  const sec = sectionById(site, 'footer')
  const f = site.footer
  const socialText = (s: SocialLink): string => {
    const v = s.value ?? s.pending
    return v ? `${s.platform} · ${v}` : s.platform
  }
  const social: { key: string; text: string; url: string | null }[] = [
    { key: 'email', text: site.contact.email, url: `mailto:${site.contact.email}` },
    ...Object.entries(site.contact)
      .filter(([k, v]) => k !== 'email' && typeof v === 'object' && v !== null)
      .map(([k, v]) => {
        const s = v as SocialLink
        return { key: k, text: socialText(s), url: s.url ?? null }
      }),
  ]
  return (
    <footer id={sec?.id ?? 'footer'} className={`site-foot${isHomeSection ? ' as-section' : ''}`}>
      <div className="foot">
        {/* 2026-09-24 用户令：页头两枚按钮（查看详细 → / 联系我 →）整体移除，页头只剩题头 */}
        <header className="foot-head">
          <div>
            {sec?.en ? <small>{sec.en}</small> : null}
            <h2>{sec?.heading}</h2>
          </div>
        </header>

        <div className="foot-cols" style={{ ['--foot-rest']: Math.max(0, f.columns.length - 2) } as CSSProperties}>
          {f.columns.map((col) => {
            if (col.id === 'brand') {
              return (
                <div key={col.id} className="fcol fcol-brand">
                  {/* 大印＝回本页顶部（2026-09-24 用户令；原为 mailto 写信，邮箱仍住在「联系」栏） */}
                  <button type="button" className="foot-brand" onClick={scrollTop} title={site.a11y.seal_top_hint} aria-label={site.a11y.seal_top_hint}>
                    <Seal variant="foot" />
                  </button>
                  {f.brand_bio ? <p className="foot-bio">{f.brand_bio}</p> : null}
                </div>
              )
            }
            if (col.from === 'nav') {
              return (
                <nav key={col.id} className="fcol" aria-label={col.title ?? undefined}>
                  {col.title ? <h3>{col.title}</h3> : null}
                  <ul>
                    {site.nav.map((n) => {
                      const onThisPage = pathOf(n.route ?? '/') === pathname
                      return (
                        <li key={n.ink}>
                          <Link
                            to={n.route ?? '/'}
                            onClick={onThisPage ? scrollTop : undefined}
                          >
                            {n.ink}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              )
            }
            if (col.from === 'contact') {
              return (
                <div key={col.id} className="fcol">
                  {col.title ? <h3>{col.title}</h3> : null}
                  <ul>
                    {social.map(({ key, text, url }) => {
                      return (
                        <li key={key}>
                          {url ? (
                            <a href={url} target={url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                              {text}
                            </a>
                          ) : (
                            <span className="soon">{text}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            }
            const links: SiteLink[] | undefined = col.links
            return (
              <nav key={col.id} className="fcol" aria-label={col.title ?? undefined}>
                {col.title ? <h3>{col.title}</h3> : null}
                <ul>
                  {(links ?? []).map((l) => {
                    const onThisPage = pathOf(l.to) === pathname
                    return isInternalPath(l.to) ? (
                      <li key={l.label}>
                        <Link to={l.to} onClick={onThisPage ? scrollTop : undefined}>
                          {l.label}
                        </Link>
                      </li>
                    ) : (
                      <li key={l.label}>
                        <a href={l.to} target={l.to.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                          {l.label}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            )
          })}
        </div>

        <div className="foot-bar">
          <span>{f.copyright}</span>
          {f.demo_note ? <span>{f.demo_note}</span> : null}
        </div>
      </div>
    </footer>
  )
}
