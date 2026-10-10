/* 技能卡指针倾斜：卡面随指针在卡内的相对位置轻微倾倒，移出由弹簧回正。
   为什么不用 CSS :hover 做：倾斜量是连续量（跟着指针走），CSS 只给得出两个定点；
   为什么用 motion 的 useSpring：站内 motion 已按需加载在这条路由（SkillBoard 的 LazyMotion），
   弹簧的中间帧由 motion 自己的 frameloop 合并写 DOM，不经 React 重渲染、也不进渲染树。
   ★倾角上限**按被倾斜元素的半尺寸反解**（capFor），不是死数 6°：倾斜绕自身中心转，近侧那条边
     被透视放大后会投影到盒子外面，外溢量随半宽增长得很快 —— 技能行在 ≥1024px 一行到底、
     实测 1085px 宽，6° 就能把行内容推到卡框外 17px（2026-10-11 用户报「技能会悬浮出框」）。
     窄行反解出的上限本就大于 6°，故手机/窄屏观感不变。
   ★只在真能悬浮的指针上挂监听（(hover: hover) and (pointer: fine) 且 pointerType === 'mouse'）：
     触屏上没有「移出」这个动作，倾斜会永久停在最后一次落点的角度上。
   ★reduced-motion（站内唯一口径 useMotionSafe）下不挂监听：两个 rotate 值恒为 0，
     motion 的 transform 会跳过 0 值 —— 连 transform 字符串都不生成，不存在「摆了没动」的中间态。
   ★键盘零影响：只加指针事件，不加 tabindex / role，不进焦点链，tab 顺序不变。 */
import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'motion/react'
import { useMotionSafe } from '../../../lib/hooks/useMotionSafe'

/** 悬浮判据：只认真能悬浮的指针（触屏上 :hover 会粘在最后一次落点）。 */
const HOVER_OK = '(hover: hover) and (pointer: fine)'
/** 单轴最大倾角（度）：指针压在角上才到满。**这只是上限**——宽行按几何再收小，见 capFor。 */
const MAX_TILT = 6
/** 倾斜的透视距离（px）：近侧放大、远侧缩小的强度由它定；越短越"近"，700 是「轻微」一档。
 *  组件把它写进 motion 的 transformPerspective —— 角度上限要按它反解，两处必须同源，故在此导出。 */
export const PERSPECTIVE = 700
/** 允许的「投影外溢」预算（px）：倾斜后近侧最多比自己那个盒子多探出这么多。
 *  ★必须小于技能卡的左右内距（`bento.css` `.bento-card` 的 `clamp(18px,2.2vw,26px)`，最小 18）：
 *    整行外溢超过内距就会画到卡框外面 —— 2026-10-11 用户报的「技能会悬浮出框」即此。
 *    实测（1440）：6° 让 1085px 宽的行外溢 43px，扣掉 27px 边距仍越出边框 17px。
 *    取 8 是给条槽那圈 10px 悬停晕留位（8 + 10 ≤ 18），两者叠起来也不出内距。 */
const SPILL_BUDGET = 8
/** 由透视几何反解的单轴角度上限：近侧投影外溢 = h·(P/(P − h·sinθ) − 1) ≤ B ⇒ sinθ ≤ P·B / (h·(h+B))。
 *  取 h = 该轴半尺寸：**宽**行按半宽收（横向外溢的主因）、**矮**行按半高收（竖向外溢）。
 *  窄行解出的上限大于 MAX_TILT ⇒ 照旧吃满 ±6°，手机/窄屏观感不变。 */
const capFor = (half: number, budget: number): number => {
  if (!(half > 0)) return MAX_TILT
  const sin = (PERSPECTIVE * budget) / (half * (half + budget))
  return Math.min(MAX_TILT, (Math.asin(Math.min(1, sin)) * 180) / Math.PI)
}
/** 弹簧：阻尼比 ≈1.1（略过阻尼），跟着指针不拖尾，回正也不来回晃。 */
const SPRING = { stiffness: 240, damping: 26, mass: 0.5 }

/**
 * 技能卡的指针倾斜：返回挂到卡根节点的 ref 与两个 rotate 弹簧（交给 motion 的 style 驱动 transform）。
 *
 * @example
 * const { ref, rotateX, rotateY } = useCardTilt<HTMLLIElement>()
 * return <m.li ref={ref} style={{ rotateX, rotateY, transformPerspective: PERSPECTIVE }}>…</m.li>
 */
export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const reduce = useMotionSafe()
  // 目标角（指针位置直接换算），弹簧只负责追它
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, SPRING)
  const rotateY = useSpring(ry, SPRING)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce || typeof window === 'undefined') return
    if (!window.matchMedia(HOVER_OK).matches) return
    let frame = 0
    let px = 0
    let py = 0
    // ★基准矩形在进卡那一刻量一次就冻住：aim 里现读 getBoundingClientRect 时，
    //   本元素的 transform 里已经躺着上一帧写进去的 rotateX/rotateY，而 rect 是**含变换**的包围盒 ——
    //   指针 → 角度 → 变大的矩形 → 角度，成了反馈回路，指针压在角上会持续过冲/发抖。
    //   冻住之后同一次悬停的分母恒定（卡面滚动位移时也不追着改，角度不会因滚动漂移）。
    let box: { left: number; top: number; width: number; height: number } | null = null
    const aim = (): void => {
      frame = 0
      const b = box ?? el.getBoundingClientRect()
      if (b.width === 0 || b.height === 0) return
      // 每根轴各按自己的半尺寸反解上限：宽行（≥1024 一行到底那种 1085px）倾角自动收小，
      // 窄行照旧吃满 MAX_TILT。轴与驱动量的对应：rotateY 由横向位置驱动 ⇒ 按半宽收；
      // rotateX 由纵向位置驱动 ⇒ 按半高收。
      const capY = capFor(b.width / 2, SPILL_BUDGET)
      const capX = capFor(b.height / 2, SPILL_BUDGET)
      // 归一化到 [-cap, cap]（指针压在左/上侧为负）。
      // 取「按压」语义：指针那一侧沉下去 —— 左侧压住则左缘后仰，CSS 的 rotateY 正角是右缘后仰，故直接乘；
      // CSS 的 rotateX 正角是上缘后仰，上侧压住要给正角，落在公式里就是 ny 取负。
      ry.set(((px - b.left) / b.width - 0.5) * 2 * capY)
      rx.set((0.5 - (py - b.top) / b.height) * 2 * capX)
    }
    const track = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      px = e.clientX
      py = e.clientY
      if (frame === 0) frame = requestAnimationFrame(aim)
    }
    // 进卡即量框 + 定位：从边缘滑进来若不再移动，也立刻给出「压住这一侧」的角度
    const enter = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      const b = el.getBoundingClientRect()
      box = { left: b.left, top: b.top, width: b.width, height: b.height }
      track(e)
    }
    const reset = (): void => {
      box = null
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      rx.set(0)
      ry.set(0)
    }
    el.addEventListener('pointermove', track)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', reset)
    return () => {
      el.removeEventListener('pointermove', track)
      el.removeEventListener('pointerenter', track)
      el.removeEventListener('pointerleave', reset)
      // 中途开启 reduced-motion / 组件卸载：把角度交回 0，不留半截倾斜
      reset()
    }
  }, [reduce, rx, ry])

  return { ref, rotateX, rotateY }
}
