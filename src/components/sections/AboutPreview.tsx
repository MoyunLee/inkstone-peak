import AboutIntro, { BENTO_GRID } from '../about/AboutIntro'
import Section from '../layout/Section'
import { sectionById, useSite } from '../../lib/data/site'

export default function AboutPreview() {
  const site = useSite()
  const sec = sectionById(site, 'about')
  if (!sec) return null
  return (
    <Section sec={sec} className="about-preview">
      <div className={BENTO_GRID}>
        <AboutIntro titleLevel={2} skillFull />
      </div>
    </Section>
  )
}
