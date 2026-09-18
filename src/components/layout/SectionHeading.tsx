import SealButton from '../ui/SealButton'
import { lockNav, stamp, swallow } from '../../lib/nav/navlock'
import { pathOf } from '../../lib/nav/nav-sync'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { useSite } from '../../lib/data/site'
import type { HomeSection } from '../../lib/types/site'

/**
 * 段标题行：左侧 h2 + 英文 kicker + 副题（.sec-intro），右侧「查看详细 →」。
 *
 * 右侧按钮只在 nav 里有对应条目且 sec.cta_detail !== false 时出现；点击复用导航锁
 * （swallow / stamp / lockNav）——已经在本页时改为平滑回顶，而不是换路由。
 *
 * @param sec 首页段配置；heading / en / intro / cta_detail 缺省即不渲染对应元素。
 * @example
 * <SectionHeading sec={sec} />
 */
export default function SectionHeading({ sec }: { sec: HomeSection }) {
  const site = useSite()
  const reduceMotion = useMotionSafe()
  const navEntry = site.nav.find((n) => n.module === sec.id && n.route)
  const route = navEntry?.route ?? null
  const showCta = route !== null && navEntry !== undefined && sec.cta_detail !== false
  const showHeadingRow = Boolean(sec.heading || sec.en || showCta)
  const showIntro = Boolean(sec.intro)
  return (
    <>
      {showHeadingRow ? (
        <div className="heading">
          {sec.heading ? <h2>{sec.heading}</h2> : null}
          {sec.en ? <small>{sec.en}</small> : null}
          {showCta && navEntry && route ? (
            <SealButton
              to={route}
              className="head-act"
              ariaLabel={site.a11y.detail_aria?.replace('{ink}', navEntry.ink)}
              onNavGuard={(to) => {
                const key = 'detail:' + sec.id
                if (swallow(key)) return false
                void to
                if (pathOf(route) === window.location.pathname) {
                  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
                  return false
                }
                stamp(key)
                lockNav(key)
                return true
              }}
            >
              {site.a11y.detail_cta} <span aria-hidden="true">→</span>
            </SealButton>
          ) : null}
        </div>
      ) : null}
      {showIntro ? <p className="sec-intro">{sec.intro}</p> : null}
    </>
  )
}
