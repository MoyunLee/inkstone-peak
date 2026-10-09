/* /about 技能卡里的一张技能卡：名称 + 等级签 + XP 条。
   经验数值不上行：值只由条长表达，读屏口径留在条的 aria-valuenow/valuemax。
   动效引擎 = motion（framer-motion 13 的现行包名）；「何时动」仍由父级 useReveal 的观察器决定。
   为什么不直接用 framer 的 whileInView：本站是预渲染站，静态 HTML 就是交付物本身（无 JS / 爬虫 /
   截图都得看到满条满数真值），而 framer 的 initial 会把「起点」写进静态 HTML。于是分工为：
   触发留在自己的观察器（可保住预渲染真值 + 绘制前归零），怎么动全部交给 Framer。
   指针倾斜：卡面跟着指针轻倒 ±6°，移出由弹簧回正 —— 只在真能悬浮的指针上挂（判据与
   实现住 useCardTilt.ts），静态 HTML 里既不写角度也不需要 JS 才能读：无 JS 就是一张端正的卡。 */
import { animate, m, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import type { Skill } from '../../../lib/data/about'
import { useIsoLayoutEffect } from '../../../lib/hooks/useIsoLayoutEffect'
import { useMotionSafe } from '../../../lib/hooks/useMotionSafe'
import { skillIcon } from './skillIcon'
import { useCardTilt } from './useCardTilt'

/** 同组相邻两卡的进场步长（秒）：阶梯只此一处，不再往 CSS 传 --i 变量。 */
const STAGGER_S = 0.045
/** 收势缓出（与站点 --ease 同族）：末段贴住目标值，不像刹车。 */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const DURATION = 0.9
const RISE = 14

const HIDDEN = { opacity: 0, y: RISE }
const SHOWN = { opacity: 1, y: 0 }
/** 悬停上浮位移（px）：原 CSS :hover 已交给 Framer，因为 Framer 写的 inline transform 会压死 CSS hover。 */
const HOVER_LIFT = -4
/** 倾斜的透视距离（px）：近侧放大、远侧缩小的强度由它定；越短越"近"，700 是「轻微」一档。 */
const PERSPECTIVE = 700

interface SkillCardProps {
  skill: Skill
  /** 档位名（中文唯一家 = site.yml about.skill_levels）。 */
  levelName: string
  /** 经验值满分（= 等级体系末档 max，父级派生后下发，卡内不写死 1000）。 */
  expMax: number
  index: number
  /** 是否已展开（父级 useReveal 的结果）。 */
  revealed: boolean
}

export default function SkillCard({ skill, levelName, expMax, index, revealed }: SkillCardProps) {
  // 用站内 useMotionSafe（活订阅 matchMedia.change）而不是 motion 的 useReducedMotion：
  // 后者是首渲染取一次的 useState 快照、此后永不更新，会话中途开启「减少动效」会和 useReveal 的口径分叉，
  // 让本该静止的条照播动画。两边同源，才能保证中途切换也直落终态。
  const reduce = useMotionSafe()
  // 行首方章的图标：文件式（source/site/skill/ 里的图，mask 取形状、颜色由 CSS 给）或兜底字形
  const icon = skillIcon(skill.icon)
  // 指针倾斜：角度链一律住 useCardTilt —— 真能悬浮的指针且非 reduced-motion 才挂监听。
  // 键盘用户完全不经过这条链：只多一个 ref 与两个 rotate 值，不动 tab 顺序、不加焦点、不吃按键。
  const { ref: tiltRef, rotateX, rotateY } = useCardTilt<HTMLLIElement>()
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
      ref={tiltRef}
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
      // perspective 必须排在最前（motion 的 transform 次序就是这样），否则近大远小会变成纯水平压扁；
      // 三点静止时 rotate 皆为 0，motion 会跳过 0 值 —— 预渲染 HTML 里因此只有这层 perspective，没有角度。
      style={{ rotateX, rotateY, transformPerspective: PERSPECTIVE }}
    >
      <div className="skill-card-head">
        {/* 图标：纯装饰（名字就在右侧），故整块 aria-hidden。文件式用 mask 上墨色（所以丢彩色 Logo 进来也是墨色），
            字形式直接画组件；mask-image 只能按文件名内联 —— 文件名是数据，写不进 CSS。 */}
        <span className="skill-card-icon" aria-hidden="true">
          {icon.kind === 'file' ? (
            <span className="skill-card-glyph" style={{ maskImage: `url(${icon.url})` }} />
          ) : (
            <icon.Glyph size={16} strokeWidth={1.5} />
          )}
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