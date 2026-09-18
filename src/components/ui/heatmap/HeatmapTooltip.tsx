import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

export interface HeatTip {
  text: string
  cx: number
  cy: number
}

/**
 * 热力图悬浮提示。
 *
 * 先按方块中心落位，挂载后按实测宽度夹进容器（直接改 style，不触发二次渲染，避免抖动）。
 *
 * @param tip 提示内容与目标坐标；null 时不渲染。
 * @param tipRef 提示节点的 ref，组件自己用来量宽。
 * @param bodyRef 容器 ref，用于算左右边界。
 * @example
 * <HeatmapTooltip tip={tip} tipRef={tipRef} bodyRef={bodyRef} />
 */
export function HeatmapTooltip({
  tip,
  tipRef,
  bodyRef,
}: {
  tip: HeatTip | null
  tipRef: RefObject<HTMLDivElement | null>
  bodyRef: RefObject<HTMLDivElement | null>
}) {
  useLayoutEffect(() => {
    const el = tipRef.current
    const body = bodyRef.current
    if (!tip || !el || !body) return
    const half = el.offsetWidth / 2
    const maxLeft = body.clientWidth - half - 2
    el.style.left = `${Math.min(Math.max(tip.cx, half + 2), Math.max(maxLeft, half + 2))}px`
  }, [tip, tipRef, bodyRef])

  if (!tip) return null
  return (
    <div className="heat-tip" role="tooltip" ref={tipRef} style={{ left: tip.cx, top: tip.cy }}>
      {tip.text}
    </div>
  )
}
