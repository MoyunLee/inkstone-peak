import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import { useMotionSafe } from './useMotionSafe'

interface RevealOptions {
  /** 视口收缩量：负下边距 = 元素探进视口一段才触发（默认底部收 8%，免得刚露个边就播完）。 */
  rootMargin?: string
  /** 触发阈值（可见比例）。0 也能触发，取小值是防「比视口还高的区块永远凑不满比例」。 */
  threshold?: number
  /**
   * 挂载时已经在视口内怎么办（默认 'stay'）。
   *  · 'stay'    —— 停在预渲染的终态、不归零不重播。全站默认：首屏可见的内容绝不闪一下。
   *  · 'animate' —— 照归零、照播。给「这一块长出来本身就是看点」的地方（技能条）。
   *    代价写在②里：慢网下用户会先看到预渲染的满条，JS 到位后才清空重长——折上专属的一次闪，
   *    是拿它换「这一下生长」。所以只给真正需要的那一处，不要当默认值用。
   *    ★这是**全站唯一一处**、例外（SkillBoard）：它按构造违反铁律③
   *      （折上首帧出现 opacity:0），独立复核两次点名过。换别处用之前先问，别把它当先例抄。
   */
  inViewAtMount?: 'stay' | 'animate'
}

interface Reveal<T extends Element> {
  /** 挂到被观察的原生标签上。 */
  ref: RefObject<T | null>
  /** 是否已展开到终态：true = 显示真值（满条 / 到点数字）。 */
  revealed: boolean
}

/**
 * 滚动进视口才展开（IntersectionObserver，一次性），并兼顾预渲染首帧。
 *
 * 时序三拍：
 * ① 首帧 revealed=true —— 服务端渲染出的静态 HTML 就是终态（无 JS、爬虫、截图都看到真值）；
 * ② 客户端布局阶段量一次视口：已有一部分在视口内就停在终态（不重播，见下），否则拨回 false —— 动画从 0 起；
 * ③ 进视口 → 置真，播完即 disconnect（不重复播，滚动来回不抖动）。
 *
 * ②的粒度是「一整个区块」：区块只要有一部分在视口内，其内部卡一律不重播 ——
 * 宁可让极少数折下的卡少播一次，也不让任何一张可见的卡闪一下。
 *
 * reduced-motion 命中时停在终态、不观察：动画是纯装饰。
 *
 * @param options rootMargin / threshold 触发条件。
 * @returns { ref, revealed }：ref 挂目标标签，revealed 交给子项决定「满格值」还是「起点值」。
 * @example
 * const { ref, revealed } = useReveal<HTMLElement>()
 * <section ref={ref}>{items.map((it, i) => <SkillCard key={it.name} revealed={revealed} index={i} />)}</section>
 */
export function useReveal<T extends Element>({ rootMargin = '0px 0px -8% 0px', threshold = 0.1, inViewAtMount = 'stay' }: RevealOptions = {}): Reveal<T> {
  const reduce = useMotionSafe()
  const ref = useRef<T | null>(null)
  const [revealed, setRevealed] = useState(true)

  useIsoLayoutEffect(() => {
    if (reduce) {
      setRevealed(true)
      return
    }
    const el = ref.current
    // 首帧就已在视口内：默认停在预渲染的终态，不归零、不重播。
    // 否则用户看到的是「静态 HTML 的满条 → 被清空 → 再长回来」；慢网下这个清空按 JS 下载时长会拉长到秒级。
    // 布局阶段 getBoundingClientRect 是准确值（后续动画只改 opacity/width，不动本块的盒位置）。
    // 宁可少播一次进场，也不闪一下 —— 除非调用方用 inViewAtMount:'animate' 明确要这一下（见 RevealOptions）。
    if (el && inViewAtMount === 'stay') {
      const box = el.getBoundingClientRect()
      if (box.top < window.innerHeight && box.bottom > 0) {
        setRevealed(true)
        return
      }
    }
    setRevealed(false)
  }, [reduce, inViewAtMount])

  useEffect(() => {
    if (reduce || revealed) return
    const el = ref.current
    if (!el) {
      // 没有可观察节点（条件渲染 / 未挂载）：退回终态，不留「永远 0 格」的半截动画
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setRevealed(true)
        io.disconnect()
      },
      { rootMargin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce, revealed, rootMargin, threshold])

  // 打印兜底：从页首直接 Ctrl+P 时，文档里没滚到的段仍停在 [data-revealed='false']
  // （opacity:0），而打印走的是**整篇**渲染 —— 不兜这一手就印出半篇空白（卡片、段题头、脚页全没）。
  // beforeprint 只在真要打印/预览时才来，命中即锁终态；此后也不再回隐藏态（本来滚到也会揭开，无碍）。
  useEffect(() => {
    const toEnd = (): void => setRevealed(true)
    window.addEventListener('beforeprint', toEnd)
    return () => window.removeEventListener('beforeprint', toEnd)
  }, [])

  return { ref, revealed }
}