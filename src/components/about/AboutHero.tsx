/* /about 顶部区域：头像居中、标签左右分列、下方居中大题。 */
import Seal from '../ui/Seal'
import { useSite } from '../../lib/data/site'

function TagList({ side, tags }: { side: 'left' | 'right'; tags?: string[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <ul className={`bento-tags bento-tags-${side}`}>
      {tags.map((t) => (
        <li key={t} className="bento-tag">
          {t}
        </li>
      ))}
    </ul>
  )
}

function SealSlot() {
  const site = useSite()
  return (
    <div className="bento-seal-slot" role="img" aria-label={site.a11y.about_seal_label}>
      <Seal variant="about" />
    </div>
  )
}

/** 大题（/about 唯一 h1；首页态 h2）。文字住 site.yml about.hero_title。 */
function HeroTitle({ titleLevel }: { titleLevel: 1 | 2 }) {
  const site = useSite()
  const heroTitle = site.about.hero_title
  return titleLevel === 2 ? (
    <h2 className="bento-hero-title">{heroTitle}</h2>
  ) : (
    <h1 className="bento-hero-title">{heroTitle}</h1>
  )
}

/** /about 与首页共用的整块：标签行（含居中印章）+ 大题；两态差别仅大题层级。 */
export default function AboutHero({
  className = '',
  titleLevel = 1,
}: {
  className?: string
  titleLevel?: 1 | 2
}) {
  const site = useSite()
  const b = site.about
  return (
    <header className={`bento-hero ${className}`.trim()}>
      <div className="bento-hero-top" role="group" aria-label={site.a11y.about_tags_label}>
        <TagList side="left" tags={b.tags_left} />
        <SealSlot />
        <TagList side="right" tags={b.tags_right} />
      </div>
      <HeroTitle titleLevel={titleLevel} />
    </header>
  )
}
