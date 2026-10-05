// Hero 粒子水墨：采样 fx/scene-data 数据山；reduced-motion 静止成画，出视口暂停 rAF。
import { createInkRenderer, type InkParticle, type InkRenderer } from './ink-render'
import { makeRnd, sampleScene, OFF_W, OFF_H } from './scene-data'

// 渲染层只关心其中一部分字段（见 fx/ink-render）：x/y/sharp/ph 每帧变，
// inkW/sprite/half/quad 建场后就是常量，WebGL 侧拿它们当每实例常量一次上载。
interface Particle extends InkParticle {
  tx: number
  ty: number
  vx: number
  vy: number
  ink: number
  size: number
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

// 启动时机由调用方掌握：sections/Hero 在首屏 LCP 之后再动态 import 本模块并调用 createInkField，
// 以免这里 4s 量级的主线程开销挤占 LCP 窗口。本模块只保证「被调用即初始化」，
// 内部的 prefers-reduced-motion 判断与 rAF 生命周期不因推迟而改变。
export function createInkField(canvas: HTMLCanvasElement): () => void {
  const made = createInkRenderer(canvas)
  if (!made) return () => {}
  // 显式标成非空：下面的渲染只发生在 build / frame / 主题回调这些嵌套函数里，
  // 靠收窄推不出非空，写死类型比到处断言干净
  const renderer: InkRenderer = made
  // 走哪条渲染路要能被核验读到：WebGL2 不可用时必须静默退回 Canvas2D，功能不打折
  canvas.dataset.inkBackend = renderer.backend
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

  // 软墨点精灵 ×3 档。
  // ★canvas 读不到 CSS 变量（E1）：墨色必须在画的时候从 documentElement 的计算值里取，
  //   否则 --ink 在深色下变浅、这里仍画浓墨，山形会整块消失。取不到或解析失败一律回落原浓墨，
  //   保证浅色现状逐像素不变。
  const inkRgb = (): [number, number, number] => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
    const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(raw)
    if (hex) {
      const s = hex[1] ?? ''
      const h = s.length <= 4 ? s.slice(0, 3).split('').map((ch) => ch + ch).join('') : s.slice(0, 6)
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(raw)
    if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    return [20, 22, 26]
  }
  const sprite = (r: number, rgb: [number, number, number]): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = c.height = r * 2
    const g = c.getContext('2d')
    if (g) {
      const gr = g.createRadialGradient(r, r, 0, r, r, r)
      gr.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`)
      gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
      g.fillStyle = gr
      g.fillRect(0, 0, r * 2, r * 2)
    }
    return c
  }
  let SP = [sprite(6, inkRgb()), sprite(9, inkRgb()), sprite(13, inkRgb())]
  renderer.setSprites(SP)
  // 主题切换的重绘入口：三张 12–26px 的小 canvas，重建成本可忽略（E1）；
  // 这里同时要把新精灵交给渲染层（WebGL 侧会重打图集并重传纹理）
  const buildSprites = (): void => {
    const rgb = inkRgb()
    SP = [sprite(6, rgb), sprite(9, rgb), sprite(13, rgb)]
    renderer.setSprites(SP)
  }

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
    P = pts.slice(0, N_MAX).map((p) => {
      const size = (0.8 + p.ink * 1.8) * dpr
      return {
        tx: p.x * sx,
        ty: p.y * sy,
        x: p.x * sx,
        y: p.y * sy,
        vx: 0,
        vy: 0,
        ink: p.ink,
        size,
        ph: rnd() * 6.28,
        sharp: 1,
        // 派生量：原式在每帧渲染循环里逐粒子重算，而它们由 ink/size 决定、建场后不再变。
        // WebGL 侧更需要它们当**每实例常量**（只上载一次），故在这里一次算清。
        inkW: Math.pow(p.ink, 1.6) * 0.95,
        sprite: size < 2.2 ? 0 : size < 3.4 ? 1 : 2,
        half: size * 2,
        quad: size * 4,
      }
    })
    renderer.setParticles(P)
  }

  // 物理 + 渲染主循环
  const frame = (now: number): void => {
    const t = (now - t0) / 1000
    const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016)
    lastNow = now
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
    // 整帧交给渲染层：WebGL2 走一次 drawArraysInstanced，取不到则回退成原来的逐粒子 drawImage
    renderer.draw(P, t, reduce)
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
  // 出视口 / 切标签页期间只标脏：回屏时先按新墨色重建精灵，再补一帧（E1）
  let dirty = false
  const resume = (): void => {
    if (dirty) {
      dirty = false
      buildSprites()
    }
    wake()
  }
  // data-theme 一变就换墨色重画：主题切换（含 system 态跟随系统）必须让水墨山跟着走。
  // canvas 读不到 CSS 变量，故监听 documentElement 的属性，而不是重设 canvas 自己的样式。
  const themeObs = new MutationObserver((): void => {
    if (reduce) {
      buildSprites()
      lastNow = performance.now()
      frame(lastNow)
      return
    }
    if (paused) {
      dirty = true
      return
    }
    buildSprites()
    wake()
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const section = canvas.closest('section')
  const surface: HTMLElement = section ?? canvas // 指针落点：整个山门（段）优先，认不出段时退化回画布
  const io = new IntersectionObserver(
    ([en]) => {
      paused = !(en?.isIntersecting ?? false)
      if (!paused) resume()
    },
    { threshold: 0 },
  )
  if (section) io.observe(section)
  const onVis = (): void => {
    paused = document.hidden
    if (!paused) resume()
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
    themeObs.disconnect()
    surface.removeEventListener('pointermove', onMove)
    surface.removeEventListener('pointerleave', onLeave)
    surface.removeEventListener('pointerdown', onDown)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVis)
    renderer.dispose()
  }
}
