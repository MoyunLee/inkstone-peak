// Hero 粒子水墨：采样 fx/scene-data 数据山；reduced-motion 静止成画，出视口暂停 rAF。
import { makeRnd, sampleScene, OFF_W, OFF_H } from './scene-data'

interface Particle {
  tx: number
  ty: number
  x: number
  y: number
  vx: number
  vy: number
  ink: number
  size: number
  ph: number
  sharp: number // 0=散开偏软，1=归位 1.2s 缓入后满锐度
}

interface Slash {
  x: number
  y: number
  c: number
  si: number
  t0: number
  p: number
  e: number
}

export function createInkField(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.innerWidth < 640
  const N_MAX = isMobile ? 2800 : 6500
  const PITCH = isMobile ? 6 : 4
  const R = isMobile ? 220 : 150
  const K = 0.012
  const DAMP = 0.94
  const rnd = makeRnd(0x9e2b25) // 相位/稀疏化用独立流，山形仍由 scene-data 种子定

  let W = 0
  let H = 0
  let dpr = 1
  let P: Particle[] = []
  let raf = 0
  let paused = false
  let lastNow = 0
  let mx = -9e9 // 画布位图坐标下的指针（= 斥力中心）
  let my = -9e9
  let lx = -9e9 // 最近一次指针的视口坐标（滚动时重算局部坐标用）
  let ly = -9e9
  let over = false // 指针是否还在山门里
  let pvx = 0 // 最近一枚 pointermove 的位移（剑气方向：顺着划动扫）
  let pvy = 0
  let slashes: Slash[] = []
  let slashLeft = 3
  let slashReadyAt = 0
  const t0 = performance.now()

  // 软墨点精灵 ×3 档
  const sprite = (r: number): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = c.height = r * 2
    const g = c.getContext('2d')
    if (g) {
      const gr = g.createRadialGradient(r, r, 0, r, r, r)
      gr.addColorStop(0, 'rgba(20,22,26,1)')
      gr.addColorStop(1, 'rgba(20,22,26,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, r * 2, r * 2)
    }
    return c
  }
  const SP = [sprite(6), sprite(9), sprite(13)]

  // 采样成粒子（超预算随机稀疏化）
  function build(): void {
    const { pts } = sampleScene(isMobile, PITCH)
    if (pts.length > N_MAX) {
      for (let i = pts.length - 1; i > N_MAX; i--) {
        const j = (rnd() * i) | 0
        const a = pts[i]
        const b = pts[j]
        if (a && b) {
          pts[i] = b
          pts[j] = a
        }
      }
    }
    const sx = W / OFF_W
    const sy = H / OFF_H
    P = pts.slice(0, N_MAX).map((p) => ({
      tx: p.x * sx,
      ty: p.y * sy,
      x: p.x * sx,
      y: p.y * sy,
      vx: 0,
      vy: 0,
      ink: p.ink,
      size: (0.8 + p.ink * 1.8) * dpr,
      ph: rnd() * 6.28,
      sharp: 1,
    }))
  }

  // 物理 + 渲染主循环
  const frame = (now: number): void => {
    const t = (now - t0) / 1000
    const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016)
    lastNow = now
    ctx.clearRect(0, 0, W, H)
    ctx.globalAlpha = 1
    const R2 = R * R
    for (const p of P) {
      let ax = (p.tx - p.x) * K
      let ay = (p.ty - p.y) * K
      const dx = p.x - mx
      const dy = p.y - my
      const d2 = dx * dx + dy * dy
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = Math.pow(1 - d / R, 2) * 1.7
        ax += (dx / d) * f
        ay += (dy / d) * f
      }
      const dis = Math.abs(p.x - p.tx) + Math.abs(p.y - p.ty)
      const mag = Math.min(1, dis / 60) // 仅散开时湍流：散如烟/化如墨
      if (mag > 0) {
        const n = Math.sin(p.tx * 0.013 + t * 0.9 + p.ph) + Math.cos(p.ty * 0.011 - t * 0.7)
        ax += n * 0.045 * mag
        ay += Math.sin(n * 2.1 + t) * 0.04 * mag
      }
      for (const s of slashes) {
        const along = (p.x - s.x) * s.c + (p.y - s.y) * s.si
        const perp = (p.x - s.x) * s.si - (p.y - s.y) * s.c
        const head = s.p * 900 - 450
        if (Math.abs(along - head) < 130 && Math.abs(perp) < 70) {
          const f = (1 - Math.abs(perp) / 70) * 5 * s.e
          ax += Math.sign(perp || 1) * -s.si * f
          ay += Math.sign(perp || 1) * s.c * f
        }
      }
      if (dis < 1.5) p.sharp = Math.min(1, p.sharp + dt / 1.2)
      else p.sharp = Math.max(0.5, p.sharp - dt * 2)
      p.vx = (p.vx + ax) * DAMP
      p.vy = (p.vy + ay) * DAMP
      p.x += p.vx
      p.y += p.vy
    }
    slashes = slashes.filter((s) => ((s.p = (now - s.t0) / 300), s.p < 1 && ((s.e = Math.sin(s.p * Math.PI)), true)))
    ctx.globalCompositeOperation = 'source-over'
    for (const p of P) {
      const br = reduce ? 0 : Math.sin(t * 0.9 + p.ph) * 0.35
      const sp = p.size < 2.2 ? SP[0] : p.size < 3.4 ? SP[1] : SP[2]
      ctx.globalAlpha = Math.min(0.92, Math.pow(p.ink, 1.6) * 0.95 * (0.6 + 0.4 * p.sharp))
      const s2 = p.size * 2
      const img = sp
      if (img) ctx.drawImage(img, p.x - s2 + br, p.y - s2 - br, p.size * 4, p.size * 4)
    }
    if (!paused && !reduce) raf = requestAnimationFrame(frame)
  }

  // 尺寸 / 指针 / 剑气 / 暂停
  function fit(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1) * (isMobile ? 0.75 : 1)
    W = canvas.width = window.innerWidth * dpr
    H = canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    build()
    if (over) toLocal(lx, ly) // 画布尺寸变了，局部坐标按新画布重算
    if (reduce) {
      lastNow = performance.now()
      frame(lastNow) // 静止成画：只画一帧
    }
  }
  let rt = 0
  const onResize = (): void => {
    window.clearTimeout(rt)
    rt = window.setTimeout(fit, 180)
  }
  // 视口坐标 → 画布位图坐标（**唯一换算处**）。
  // 画布虽由 fit() 定成「视口尺寸」，却挂在山门段里随文档滚动（position:absolute）——
  // 直接拿 clientX/clientY 当画布坐标，滚动后散开中心会顶到指针上方整整一个 scrollY
  // （2026-09-19 实测：scrollY=260 时散开中心偏高 254px）。
  const toLocal = (cx: number, cy: number): void => {
    const r = canvas.getBoundingClientRect()
    mx = (cx - r.left) * (r.width > 0 ? canvas.width / r.width : 1)
    my = (cy - r.top) * (r.height > 0 ? canvas.height / r.height : 1)
    lx = cx
    ly = cy
  }
  const onMove = (e: PointerEvent): void => {
    const px = mx
    const py = my
    over = true
    toLocal(e.clientX, e.clientY)
    if (px > -9e8) {
      pvx = mx - px // 剑气方向的事实源：上一枚样本 → 这一枚的位移
      pvy = my - py
    }
  }
  const onLeave = (): void => {
    over = false
    mx = my = -9e9
  }
  // 滚轮滚动时指针可以一动不动，但画布在动：局部坐标必须跟着重算，
  // 否则散开中心又漂回旧位置；指针被滚出山门则当场收工。
  const onScroll = (): void => {
    if (!over) return
    const r = canvas.getBoundingClientRect()
    if (lx < r.left || lx > r.right || ly < r.top || ly > r.bottom) {
      over = false
      mx = my = -9e9
      return
    }
    toLocal(lx, ly)
  }
  const onDown = (e: PointerEvent): void => {
    if (reduce || slashLeft <= 0 || performance.now() < slashReadyAt) return
    slashLeft--
    slashReadyAt = performance.now() + 2000 // 限 3 次/页、冷却 2s
    toLocal(e.clientX, e.clientY)
    // 剑气方向 = 指针**划动方向**（原实现取「上一帧坐标 − 当前坐标」，两值几乎相同 ⇒ 恒为竖直扫过，2026-09-19 实测比值 0.84）；
    // 原地点击无位移时回落竖直下扫，保持原手感。
    const sweep = Math.hypot(pvx, pvy) > 1 ? Math.atan2(pvy, pvx) : Math.PI / 2
    slashes.push({ x: mx, y: my, c: Math.cos(sweep), si: Math.sin(sweep), t0: performance.now(), p: 0, e: 1 })
  }
  const wake = (): void => {
    if (!paused && !reduce) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(frame)
    }
  }
  const section = canvas.closest('section')
  const surface: HTMLElement = section ?? canvas // 指针落点：整个山门（段）优先，认不出段时退化回画布
  const io = new IntersectionObserver(
    ([en]) => {
      paused = !(en?.isIntersecting ?? false)
      if (!paused) wake()
    },
    { threshold: 0 },
  )
  if (section) io.observe(section)
  const onVis = (): void => {
    paused = document.hidden
    if (!paused) wake()
  }

  // 指针事件挂**段**而不是画布：画布上还压着 .hero-copy（大字标题 / 按钮），挂画布的话
  // 悬停标题只收得到 pointerleave（散开整个消失）；挂段则整个山门都跟手。
  surface.addEventListener('pointermove', onMove)
  surface.addEventListener('pointerleave', onLeave)
  surface.addEventListener('pointerdown', onDown)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVis)

  fit()
  if (!reduce) raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    window.clearTimeout(rt)
    io.disconnect()
    surface.removeEventListener('pointermove', onMove)
    surface.removeEventListener('pointerleave', onLeave)
    surface.removeEventListener('pointerdown', onDown)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVis)
  }
}
