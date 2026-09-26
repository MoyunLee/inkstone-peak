import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, WheelEvent as RWheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useSite } from '../../lib/data/site'

/** 视口状态：s=缩放，x/y=以舞台中心为原点的位移（px）。全部直接写进 DOM style，不走 React 渲染。 */
interface View {
  s: number
  x: number
  y: number
}

/** 缩放下限恒为 1（图永远不小于「适配视口」）；上限 5 够看细节又不至于一滑就飞出画外。 */
const MIN = 1
const MAX = 5
/** 单指下滑关闭的位移阈值（px）：小于它回弹，大于它关层。 */
const CLOSE_DY = 110
/** 视为「点击」的最大位移：超过就当成拖动/滑动，不再切换缩放。 */
const TAP_SLOP = 8
/** 小于这个原始宽度的图不放大（印章、图标一级的装饰小图）。 */
const MIN_NATURAL_W = 160

/**
 * 取本次点击要放大的图；不合格一律返回 null，由调用方放行走原行为。
 *
 * 排除四类：① 链接里的图（卡片封面与轮播封面——点它是「去详情页」，不是看图）；
 * ② noscript 里的降级底图；③ 标了 data-no-zoom 的（留给以后显式关掉的图）；④ 放大层自己 + 图标级小图。
 *
 * @param target 点击事件的目标节点。
 * @returns 命中的 <img>；不合格返回 null。
 */
function pickImage(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null
  const img = target instanceof HTMLImageElement ? target : target.closest('img')
  if (!img) return null
  if (img.closest('a') || img.closest('noscript') || img.closest('[data-no-zoom]') || img.closest('.lb')) return null
  if (!img.currentSrc && !img.src) return null
  if (img.naturalWidth > 0 && img.naturalWidth < MIN_NATURAL_W) return null
  return img
}

/**
 * 点图放大层（2026-09-23 新功能：用户令「点图片能像图库那样单独看这张照片」）。
 *
 * 挂在应用根（routes.tsx），用**委托**监听 document 的 click：正文是构建期直出的 HTML
 * （PostBody 的 dangerouslySetInnerHTML），React 不认识那些 <img>，事件委托是唯一能覆盖全站的一处。
 *
 * 手势：点图 = 适配 ⇄ 2 倍（以点击点为锚）；双指捏合 = 连续缩放；放大后拖动 = 平移；
 * 未放大时单指下滑 = 关闭；点背景 / 关闭按钮 / Esc = 关闭；+ - 0 与方向键服务键盘用户。
 * 滚动锁用 html[data-lb]（overflow:hidden + 滚动条补位），关闭时还原并把焦点还给打开它的元素。
 *
 * @example
 * <Lightbox />   // routes.tsx 里挂一次即可，全站生效
 */
export default function Lightbox() {
  const a11y = useSite().a11y
  const { pathname } = useLocation()
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<Element | null>(null)
  const view = useRef<View>({ s: MIN, x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; dx: number; dy: number; mx: number; my: number } | null>(null)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; s: number } | null>(null)

  /** 把 view 写进 DOM（免去每次 pointermove 触发 React 渲染）。 */
  const paint = useCallback((el: HTMLImageElement | null) => {
    if (!el) return
    const v = view.current
    el.style.transform = 'translate3d(' + v.x + 'px,' + v.y + 'px,0) scale(' + v.s + ')'
    el.dataset.zoomed = v.s > MIN ? 'true' : 'false'
  }, [])

  /** 以舞台中心为原点、把舞台坐标系里的点 p 固定住地缩放到 s。 */
  const zoomAt = useCallback((s: number, px: number, py: number) => {
    const v = view.current
    const next = Math.min(MAX, Math.max(MIN, s))
    if (next === v.s) return
    const ux = (px - v.x) / v.s
    const uy = (py - v.y) / v.s
    v.x = px - ux * next
    v.y = py - uy * next
    v.s = next
    if (next === MIN) {
      v.x = 0
      v.y = 0
    }
    paint(imgRef.current)
  }, [paint])

  const zoomBy = useCallback((k: number) => { zoomAt(view.current.s * k, 0, 0) }, [zoomAt])

  const panBy = useCallback((dx: number, dy: number) => {
    const v = view.current
    if (v.s <= MIN) return
    v.x += dx
    v.y += dy
    paint(imgRef.current)
  }, [paint])

  const close = useCallback(() => setShot(null), [])

  // 打开：锁滚动 + 焦点进层；关闭：解锁 + 焦点还给打开它的元素
  useEffect(() => {
    if (!shot) return
    const html = document.documentElement
    const pad = window.innerWidth - html.clientWidth
    html.dataset.lb = '1'
    if (pad > 0) html.style.setProperty('--lb-pad', pad + 'px')
    closeRef.current?.focus()
    const opener = openerRef.current as HTMLElement | null
    return () => {
      delete html.dataset.lb
      html.style.removeProperty('--lb-pad')
      opener?.focus?.()
    }
  }, [shot])

  // 打开时重置视口（换一张图必须回到适配态）
  useEffect(() => {
    if (!shot) return
    view.current = { s: MIN, x: 0, y: 0 }
    pts.current.clear()
    pinch.current = null
    paint(imgRef.current)
  }, [shot, paint])

  // 事件委托：全站任何一张内容图都能点开
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const img = pickImage(e.target)
      if (!img) return
      e.preventDefault()
      openerRef.current = document.activeElement
      // 放大层要最大那一档：有 srcset 的图由 RespImg 把母版地址记在 data-full——
      // currentSrc 给的是浏览器实际选中的小档，拿它放大等于「越点越糊」。
      setShot({ src: img.dataset.full || img.currentSrc || img.src, alt: img.alt || '' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // 换页即关（放大层是罪层：路由一变必须收）
  useEffect(() => { setShot(null) }, [pathname])

  // 键盘：Esc 关、+/- 缩放、0 复位、方向键平移
  useEffect(() => {
    if (!shot) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return }
      if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus(); return }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.25); return }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(0.8); return }
      if (e.key === '0') { e.preventDefault(); zoomAt(MIN, 0, 0); return }
      const step = 48
      if (e.key === 'ArrowUp') panBy(0, step)
      if (e.key === 'ArrowDown') panBy(0, -step)
      if (e.key === 'ArrowLeft') panBy(step, 0)
      if (e.key === 'ArrowRight') panBy(-step, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shot, close, zoomBy, zoomAt, panBy])

  if (!shot) return null

  /** 舞台坐标：舞台铺满视口、自身不位移，故用视口中心换算即可（图恒居中）。 */
  const stagePoint = (clientX: number, clientY: number) => ({
    px: clientX - window.innerWidth / 2,
    py: clientY - window.innerHeight / 2,
  })

  const onPointerDown = (e: RPointerEvent<HTMLImageElement>) => {
    e.currentTarget.dataset.drag = 'true'
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.current.s }
      drag.current = null
      return
    }
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, mx: 0, my: 0 }
  }

  const onPointerMove = (e: RPointerEvent<HTMLImageElement>) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size >= 2 && pinch.current) {
      const [a, b] = [...pts.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const { px, py } = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      zoomAt(pinch.current.s * (d / pinch.current.d), px, py)
      return
    }
    const d = drag.current
    if (!d) return
    const mx = e.clientX - d.x
    const my = e.clientY - d.y
    d.dx = mx
    d.dy = my
    if (view.current.s > MIN) {
      panBy(mx - d.mx, my - d.my)
    } else if (my > 0) {
      // 未放大时的下滑：跟手位移，松手决定关还是回弹
      view.current.y = my
      paint(imgRef.current)
    }
    d.mx = mx
    d.my = my
  }

  const onPointerUp = (e: RPointerEvent<HTMLImageElement>) => {
    delete e.currentTarget.dataset.drag
    pts.current.delete(e.pointerId)
    if (pts.current.size < 2) pinch.current = null
    const d = drag.current
    if (!d) return
    drag.current = null
    const moved = Math.hypot(d.dx, d.dy)
    if (view.current.s <= MIN && d.dy > CLOSE_DY) { close(); return }
    if (view.current.s <= MIN && view.current.y !== 0) {
      view.current.y = 0
      paint(imgRef.current)
    }
    if (moved > TAP_SLOP) return
    const { px, py } = stagePoint(e.clientX, e.clientY)
    zoomAt(view.current.s > MIN ? MIN : 2, px, py)
  }

  const onWheel = (e: RWheelEvent<HTMLImageElement>) => {
    e.preventDefault()
    const { px, py } = stagePoint(e.clientX, e.clientY)
    zoomAt(view.current.s * (e.deltaY < 0 ? 1.15 : 0.87), px, py)
  }

  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={a11y.lightbox_label ?? ''}>
      <button ref={closeRef} type="button" className="lb-close" aria-label={a11y.lightbox_close ?? ''} onClick={close}>
        <span aria-hidden="true">{'\u00d7'}</span>
      </button>
      <div
        className="lb-stage"
        ref={stageRef}
        onClick={(e) => { if (e.target === stageRef.current) close() }}
      >
        <img
          ref={imgRef}
          className="lb-img"
          src={shot.src}
          alt={shot.alt}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    </div>,
    document.body,
  )
}
