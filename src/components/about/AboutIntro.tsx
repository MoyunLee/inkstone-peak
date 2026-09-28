/* /about 便当盒上半部（首页「观自」段与 /about 页共用）。 */
import AboutHero from './AboutHero'
import IntroCard from './IntroCard'
import PursuitCard from './PursuitCard'
import SkillBoard from './SkillBoard'
import { hasSkills } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'

/** 便当盒网格骨架（全站唯一集中处）：sm 单列 → md 两列 → lg 三列；改断点/间距只改这里。 */
export const BENTO_GRID = 'bento-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'

export default function AboutIntro({
  titleLevel = 1,
  skillFull = false,
  showSkill = true,
}: {
  titleLevel?: 1 | 2
  skillFull?: boolean
  /** 技能卡是否挂在本段尾部：/about 要把技能卡挪到独立整行，故交由调用方另挂（见 pages/About.tsx）。 */
  showSkill?: boolean
}) {
  const site = useSite()
  return (
    <>
      <AboutHero className="md:col-span-2 lg:col-span-3" titleLevel={titleLevel} />
      <IntroCard className="md:col-span-2 lg:col-span-2" />
      <PursuitCard className="md:col-span-2 lg:col-span-1" />
      {showSkill && hasSkills(site) ? (
        <SkillBoard className={skillFull ? 'md:col-span-2 lg:col-span-3' : 'md:col-span-2 lg:col-span-2'} />
      ) : null}
    </>
  )
}
