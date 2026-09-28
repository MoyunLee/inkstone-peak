/* /about 技能卡里的一张技能卡：名称 + 等级签 + XP 条。
   经验数值不上行（2026-09-27 用户定）：值只由条长表达，读屏口径留在条的 aria-valuenow/valuemax。
   动效引擎 = motion（framer-motion 13 的现行包名）；「何时动」仍由父级 useReveal 的观察器决定。
   为什么不直接用 framer 的 whileInView：本站是预渲染站，静态 HTML 就是交付物本身（无 JS / 爬虫 /
   截图都得看到满条满数真值），而 framer 的 initial 会把「起点」写进静态 HTML。于是分工为：
   触发留在自己的观察器（可保住预渲染真值 + 绘制前归零），怎么动全部交给 Framer。 */
import { animate, m, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import type { Skill } from '../../../lib/data/about'
import { useIsoLayoutEffect } from '../../../lib/hooks/useIsoLayoutEffect'
import { useMotionSafe } from '../../../lib/hooks/useMotionSafe'
import { skillGlyph } from './skillGlyph'

/** 同组相邻两卡的进场步长（秒）：阶梯只此一处，不再往 CSS 传 --i 变量。 */
const STAGGER_S = 0.045
/** 收势缓出（与站点 --ease 同族）：末段贴住目标值，不像刹车。 */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
/** 条生长时长（秒）。 */
const DURATION = 0.9
/** 进场位移量（px）。 */
const RISE = 14

const HIDDEN = { opacity: 0, y: RISE }
const SHOWN = { opacity: 1, y: 0 }
/** 悬停上浮位移（px）：原 CSS :hover 已交给 Framer，因为 Framer 写的 inline transform 会压死 CSS hover。 */
const HOVER_LIFT = -4

interface SkillCardProps {
  skill: Skill
  /** 档位名（中文唯一家 = site.yml about.skill_levels）。 */
  levelName: string
  /** 经验值满分（= 等级体系末档 max，父级派生后下发，卡内不写死 1000）。 */
  expMax: number
  /** 列表序号：给条做阶梯延迟。 */
  index: number
  /** 是否已展开（父级 useReveal 的结果）。 */
  revealed: boolean
}

export default function SkillCard({ skill, levelName, expMax, index, revealed }: SkillCardProps) {
  // 用站内 useMotionSafe（活订阅 matchMedia.change）而不是 motion 的 useReducedMotion：
  // 后者是首渲染取一次的 useState 快照、此后永不更新，会话中途开启「减少动效」会和 useReveal 的口径分叉，
  // 让本该静止的条照播动画。两边同源，才能保证中途切换也直落终态。
  const reduce = useMotionSafe()
  // 行首方章的字形（未知名/未给都回落 circle，见 skillGlyph.ts）
  const Glyph = skillGlyph(skill.icon)
  // 初值＝终值：服务端渲染出的静态 HTML 直接是真数真条（不是 0）
  const exp = useMotionValue(skill.exp)
  // 条宽由 MotionValue 推导，Framer 自己写 inline style，不经 React 每帧重渲染
  const barWidth = useTransform(exp, (v) => {
    if (expMax <= 0) return '0%'
    const pct = Math.min(100, (v / expMax) * 100)
    return `${Math.round(pct * 100) / 100}%` // 收两位小数：免得预渲染 HTML 里出现 56.99999999999999%
  })
  const delay = index * STAGGER_S

  // 这里归零的是「值」，同步发生在绘制前（服务端不跑这条链）：动画因此从 0 起跑，不存在「从终值起跑」的竞态。
  // 注意 motion 写 DOM 走自己的 frameloop（rAF），所以 #root 首绘仍是预渲染的终态、与 #prerender 连续，
  // 归零要到下一帧才可见 —— 别把这两件事混成「绘制前归零」。 
  useIsoLayoutEffect(() => {
    if (!revealed) exp.set(0)
  }, [revealed, exp])

  useEffect(() => {
    if (!revealed) return
    if (reduce) {
      exp.set(skill.exp)
      return
    }
    if (exp.get() === skill.exp) return // 挂载首帧 revealed 即 true 且值已是终值：不必空跑一次 0→0 的动画
    const controls = animate(exp, skill.exp, { duration: DURATION, ease: EASE, delay })
    return () => controls.stop()
  }, [revealed, reduce, exp, skill.exp, delay])

  return (
    <m.li
      className="skill-card"
      data-level={skill.level}
      initial={false}
      animate={revealed ? SHOWN : HIDDEN}
      transition={{
        duration: revealed ? 0.6 : 0,
        ease: EASE,
        delay: revealed ? delay : 0,
        y: { duration: revealed ? 0.28 : 0, ease: EASE, delay: revealed ? delay : 0 },
      }}
      whileHover={{ y: HOVER_LIFT, transition: { duration: 0.16, ease: EASE } }}
    >
      <div className="skill-card-head">
        {/* 用途字形：纯装饰（名字就在右侧），故整块 aria-hidden */}
        <span className="skill-card-icon" aria-hidden="true">
          <Glyph size={13} strokeWidth={1.5} />
        </span>
        <span className="skill-card-name">{skill.name}</span>
        <span className="skill-card-level">
          Lv.{skill.level} {levelName}
        </span>
      </div>
      {/* 语义交给 progressbar：读屏按「技能名 / 当前经验 / 满分」播报，装饰条本身 aria-hidden */}
      <div className="skill-track" role="progressbar" aria-valuemin={0} aria-valuemax={expMax} aria-valuenow={skill.exp} aria-label={skill.name}>
        <m.span className="skill-track-fill" style={{ width: barWidth }} aria-hidden="true" />
      </div>
    </m.li>
  )
}