/* S5 传音 · 结构化页脚：大标题复用 home.sections[footer].heading（单一来源）。 */
import { Link, useLocation } from 'react-router-dom'
import type { CSSProperties, MouseEvent } from 'react'
import Seal from '../ui/Seal'
import { pathOf } from '../../lib/nav/nav-sync'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { useReveal } from '../../lib/hooks/useReveal'
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
  // 脚页进场（2026-10-09）：把整个脚页当一个动效对象，隐藏态/补间/阶梯全在 tokens.css 的「脚页进场」段。
  // rootMargin 下边收 20%：等脚页真探进画面一段再开演，别刚露个边就把底下看不见的那半也演完。
  // threshold 取 0：脚页比视口还高，比例阈值一大就永远凑不满（同 Section 的那条注记）。
  // ★为什么不跟技能栏一样要 inViewAtMount:'animate'：实测五条路由挂载时脚页 top 在 1468–5169（视口 900），
  //   最短的 /blog 也整段在折下 —— 一律走滚动触发，用默认 'stay' 就够，且真遇到"首屏就看得见"的短页时
  //   它会停在终态不闪（这才是 'stay' 该干的活）。
  const { ref: footRef, revealed } = useReveal<HTMLElement>({ rootMargin: '0px 0px -20% 0px', threshold: 0 })
  const socialText = (s: SocialLink): string => {
    const v = s.value ?? s.pending
    return v ? `${s.platform} · ${v}` : s.platform
  }
  const social: { key: string; text: string; url: string | null }[] = [
    // 邮箱行的前缀标签（如「邮箱」）取自 site.yml 的 footer.email_label——界面中文不在组件里写死（gate-cn 会拦）；分隔符与社交行一致。
    { key: 'email', text: f.email_label ? `${f.email_label} · ${site.contact.email}` : site.contact.email, url: `mailto:${site.contact.email}` },
    ...Object.entries(site.contact)
      .filter(([k, v]) => k !== 'email' && typeof v === 'object' && v !== null)
      .map(([k, v]) => {
        const s = v as SocialLink
        return { key: k, text: socialText(s), url: s.url ?? null }
      }),
  ]
  return (
    <footer ref={footRef} id={sec?.id ?? 'footer'} data-revealed={revealed ? 'true' : 'false'} className={`site-foot${isHomeSection ? ' as-section' : ''}`}>
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
                    {site.nav.map((n, i) => {
                      const onThisPage = pathOf(n.route ?? '/') === pathname
                      return (
                        <li key={n.ink} style={{ ['--i']: i } as CSSProperties}>
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
                    {social.map(({ key, text, url }, i) => {
                      return (
                        <li key={key} style={{ ['--i']: i } as CSSProperties}>
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
                  {(links ?? []).map((l, i) => {
                    const onThisPage = pathOf(l.to) === pathname
                    return isInternalPath(l.to) ? (
                      <li key={l.label} style={{ ['--i']: i } as CSSProperties}>
                        <Link to={l.to} onClick={onThisPage ? scrollTop : undefined}>
                          {l.label}
                        </Link>
                      </li>
                    ) : (
                      <li key={l.label} style={{ ['--i']: i } as CSSProperties}>
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
