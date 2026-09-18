// 程序化「数据山」生成器：纯函数零 DOM，ink-field 与构建期底图共用一份采样事实。

export const OFF_W = 960
export const OFF_H = 560

export interface ScenePoint {
  x: number
  y: number
  ink: number
}

export function makeRnd(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function ridge(n: number, base: number, amp: number, rough: number, rnd: () => number): number[] {
  let hs = [base + (rnd() - 0.5) * amp, base + (rnd() - 0.5) * amp]
  for (let s = 0; s < n; s++) {
    const next: number[] = [hs[0] as number]
    for (let i = 0; i < hs.length - 1; i++) {
      next.push(((hs[i] as number) + (hs[i + 1] as number)) / 2 + (rnd() - 0.5) * amp * Math.pow(rough, s), hs[i + 1] as number)
    }
    hs = next
  }
  return hs
}

interface Layer {
  sub: number
  ratio: number
  amp: number
  inkv: number
}

export function layersFor(mobile: boolean): Layer[] {
  return mobile
    ? [
        { sub: 5, ratio: 0.2, amp: 150, inkv: 0.3 },
        { sub: 6, ratio: 0.34, amp: 105, inkv: 0.55 },
        { sub: 6, ratio: 0.48, amp: 70, inkv: 0.8 },
      ]
    : [
        { sub: 5, ratio: 0.26, amp: 150, inkv: 0.3 },
        { sub: 6, ratio: 0.46, amp: 105, inkv: 0.55 },
        { sub: 6, ratio: 0.66, amp: 70, inkv: 0.8 },
      ]
}

interface Speck {
  x: number
  y: number
  w: number
  h: number
}

function layerGeometry(layer: Layer, rnd: () => number): { ys: Float32Array; specks: Speck[]; topY: number } {
  const hs = ridge(layer.sub, OFF_H * layer.ratio, layer.amp, 0.58, rnd)
  const ys = new Float32Array(OFF_W)
  for (let x = 0; x < OFF_W; x++) {
    const fi = x / (hs.length - 1)
    const i = Math.min(hs.length - 2, Math.floor(fi))
    const t = fi - i
    ys[x] = ((hs[i] as number) * (1 - t) + (hs[i + 1] as number) * t) | 0
  }
  const specks: Speck[] = []
  for (let i = 0; i < 260; i++) {
    specks.push({
      x: rnd() * OFF_W,
      y: OFF_H * layer.ratio + (rnd() - 0.5) * layer.amp * 0.8,
      w: 1 + rnd() * 2,
      h: 1 + rnd() * 2,
    })
  }
  return { ys, specks, topY: OFF_H * layer.ratio - layer.amp }
}

/** 生成 OFF_W×OFF_H 墨量场（三层 source-over 复合）；返回逐像素 alpha + pitch 网格粒子点。 */
export function sampleScene(mobile: boolean, pitch: number): { alpha: Float32Array; pts: ScenePoint[] } {
  const rnd = makeRnd(20260905)
  const alpha = new Float32Array(OFF_W * OFF_H)
  for (const layer of layersFor(mobile)) {
    const { ys, specks, topY } = layerGeometry(layer, rnd)
    const span = OFF_H - topY
    for (let x = 0; x < OFF_W; x++) {
      const ry = ys[x] as number
      for (let y = Math.max(0, ry | 0); y < OFF_H; y++) {
        const grad = layer.inkv - ((y - topY) / span) * (layer.inkv * 0.88) // 下缘晕淡=水墨
        const i = y * OFF_W + x
        const cur = alpha[i] ?? 0
        alpha[i] = 1 - (1 - cur) * (1 - Math.max(0, grad))
      }
    }
    for (const sp of specks) {
      const a = layer.inkv * 0.5
      for (let y = sp.y | 0; y < Math.min(OFF_H, sp.y + sp.h); y++) {
        for (let x = sp.x | 0; x < Math.min(OFF_W, sp.x + sp.w); x++) {
          const i = y * OFF_W + x
          const cur = alpha[i] ?? 0
          alpha[i] = 1 - (1 - cur) * (1 - a)
        }
      }
    }
  }
  const pts: ScenePoint[] = []
  for (let y = 0; y < OFF_H; y += pitch) {
    for (let x = 0; x < OFF_W; x += pitch) {
      const a = alpha[y * OFF_W + x] as number
      if (a > 0.06) pts.push({ x, y, ink: a })
    }
  }
  return { alpha, pts }
}

/** 样片 --fade-y/--fade-x 双层遮罩解析式（预烘底图时烤进 alpha；canvas 走 CSS mask） */
export function fadeAt(x: number, y: number): number {
  const fy = ((): number => {
    const r = y / OFF_H
    if (r <= 0.3) return 1
    if (r <= 0.48) return 1 - ((r - 0.3) / 0.18) * 0.22
    if (r <= 0.64) return 0.78 - ((r - 0.48) / 0.16) * 0.36
    if (r <= 0.76) return 0.42 - ((r - 0.64) / 0.12) * 0.28
    if (r <= 0.88) return 0.14 - ((r - 0.76) / 0.12) * 0.14
    return 0
  })()
  const fx = ((): number => {
    const r = x / OFF_W
    if (r <= 0.14) return 0.26
    if (r <= 0.38) return 0.26 + ((r - 0.14) / 0.24) * 0.34
    if (r <= 0.66) return 0.6 + ((r - 0.38) / 0.28) * 0.4
    return 1
  })()
  return Math.min(fy, fx)
}
