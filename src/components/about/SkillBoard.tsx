/* /about 技能便当卡「开启创造力」：一整列软件技能，逐条长经验条。
   跨列宽度由调用方给（AboutIntro / pages/About）：/about 独占末行整行、首页「观自」预览整行。
   2026-09-27 二次定版（用户定）：分类名与分类图标删除、技能名统一为软件名、行尾经验数值删除
   —— 分组在界面上不再存在，数据层同步拍平（site.yml about.skills），故这里就是一个平列表；
   经验值只由条长表达，读屏口径留在条自身的 aria-valuenow / aria-valuemax 上。
   LazyMotion 只用来收窄特性集：静态喂 domAnimation（动画 + variants + 退场 + 悬停/点按手势），
   不含 domMax（拖拽 + layout 动画，技能区用不到）。
   **特性必须静态 import**：换成懒加载（`features={() => import(...)}`）实测把起点态打死了 ——
   特性晚于 hydration 到达，子卡「绘制前归零」写进一个还没绑定到 DOM 的 MotionValue，
   12 张卡首屏全部停在预渲染的满条上。省 3.9KB 不值这个。
   子树内禁写 motion.*：strict 只在 dev 抛错、prod 静默，而本站没有错误边界（dev 会白屏、线上反而好）。 */
import { LazyMotion, domAnimation } from 'motion/react'
import { skillExpMax, skillLevelName, skillLevels, skills } from '../../lib/data/about'
import { useSite } from '../../lib/data/site'
import { useReveal } from '../../lib/hooks/useReveal'
import SkillCard from './skills/SkillCard'

export default function SkillBoard({ className = '' }: { className?: string }) {
  const site = useSite()
  const b = site.about
  const levels = skillLevels(site)
  const expMax = skillExpMax(site)
  // 观察器挂在整张列表上：列表整体进视口即整列一起长，喜好由列表内部的阶梯延迟给
  const { ref, revealed } = useReveal<HTMLUListElement>()
  const list = skills(site)
  return (
    <LazyMotion strict features={domAnimation}>
      <div className={`bento-card bento-skill ${className}`.trim()}>
        {b.label_skill ? <small className="bento-label">{b.label_skill}</small> : null}
        {b.title_skill ? <h2 className="bento-card-title">{b.title_skill}</h2> : null}
        <ul ref={ref} className="skill-list">
          {list.map((s, i) => (
            <SkillCard
              key={s.name}
              skill={s}
              levelName={skillLevelName(levels, s.level)}
              expMax={expMax}
              index={i}
              revealed={revealed}
            />
          ))}
        </ul>
      </div>
    </LazyMotion>
  )
}