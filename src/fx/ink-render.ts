// Hero 粒子水墨的渲染层：优先 WebGL2 实例化，取不到就**原样退回** Canvas2D 逐粒子 drawImage。
// 为什么单独立这一层（实测）：Canvas2D 路径每帧要发 6500 次 drawImage、每粒子改一次 globalAlpha，
// 4x CPU 节流下主线程忙 101%、rAF 只剩 13fps；更要紧的是**指针离场后与静置时的开销完全一样** ——
// 它是常驻空转，不是交互开销。实例化渲染把同样这 6500 个精灵合成**一次** draw call。
// 画面一致性靠「预乘混合」对齐：Canvas2D 的 globalAlpha 作用于源色（画布内部即预乘存储），
// 故 WebGL 侧同样用 UNPACK_PREMULTIPLY_ALPHA_WEBGL + blendFunc(ONE, ONE_MINUS_SRC_ALPHA)，
// 片元只把采样值乘 alpha —— 两边是逐项同一个合成公式，残差只来自缩放采样滤镜。
// 回退是硬要求：探针失败（无 WebGL2 / 上下文被策略禁用 / 着色器编译不过）必须还能画。
// 探针刻意跑在**弃用画布**上：同一张 canvas 一旦拿到 webgl2 上下文就再也拿不到 2d 上下文，
// 所以必须在碰真画布之前把后端定死。走哪条路落在 canvas.dataset.inkBackend 上，供核验读取。

/** 渲染层关心的粒子字段（物理层另有 tx/ty/vx/vy/ink/size，渲染不看）。 */
export interface InkParticle {
  x: number
  y: number
  ph: number
  /** 0=散开偏软，1=归位后满锐度 */
  sharp: number
  /** Math.pow(ink,1.6)*0.95：建场时算好，两条路都别每帧再算 */
  inkW: number
  /** 软墨点精灵档位 0/1/2 */
  sprite: number
  /** size*2：绘制左上角偏移 */
  half: number
  /** size*4：绘制边长 */
  quad: number
}

export interface InkRenderer {
  /** 'webgl2' | '2d'，实际生效的后端 */
  readonly backend: 'webgl2' | '2d'
  /** 换主题时重建的三档软墨点精灵 */
  setSprites(sprites: readonly HTMLCanvasElement[]): void
  /** 建场 / 换尺寸后调用：上载每粒子不变的实例常量 */
  setParticles(particles: readonly InkParticle[]): void
  /** 画一帧；reduce=true 时呼吸位移按 0 处理（与 reduced-motion 的静态一帧一致） */
  draw(particles: readonly InkParticle[], t: number, reduce: boolean): void
  dispose(): void
}

/** 每粒子 alpha：两条路共用同一式，免得各算一份日后走偏 */
const alphaOf = (p: InkParticle): number => Math.min(0.92, p.inkW * (0.6 + 0.4 * p.sharp))

const ATTRS: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'low-power', // 装饰性常驻图层，不值得唤起独显
}

export function createInkRenderer(canvas: HTMLCanvasElement): InkRenderer | null {
  // 先探针后真画布：探针过了，真画布上「编译 + 建缓冲」几乎没有失败余地
  if (probeGl()) {
    const r = createGl(canvas)
    if (r) return r
  }
  return create2d(canvas)
}

// ── Canvas2D 回退：与改造前的渲染循环逐字同义 ─────────────────────────────
function create2d(canvas: HTMLCanvasElement): InkRenderer | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  let sprites: readonly HTMLCanvasElement[] = []
  return {
    backend: '2d',
    setSprites(s) {
      sprites = s
    },
    setParticles() {
      // 2D 侧直接读粒子字段，不需要常量缓冲
    },
    draw(P, t, reduce) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      for (const p of P) {
        const br = reduce ? 0 : Math.sin(t * 0.9 + p.ph) * 0.35
        const img = sprites[p.sprite]
        ctx.globalAlpha = alphaOf(p)
        if (img) ctx.drawImage(img, p.x - p.half + br, p.y - p.half - br, p.quad, p.quad)
      }
    },
    dispose() {
      // 2D 上下文随画布生命周期回收
    },
  }
}

// ── WebGL2 实例化 ────────────────────────────────────────────────────────
// 三档精灵打进一张图集（格间留 2px 透明边，避免 LINEAR 采样串到邻格），于是全场只剩一次
// drawArraysInstanced。每粒子不变的量（半宽/边长/档位/相位）与每帧变的量（x/y/alpha）分成两个
// 实例缓冲：前者只在建场时上载，后者每帧一次 orphan 上传（6500×3 个 float，可忽略）。
const VERT = `#version 300 es
in vec2 a_corner;
in vec3 a_dyn;
in vec4 a_sta;
uniform vec2 u_res;
uniform vec2 u_br;
uniform vec4 u_uv[3];
out vec2 v_uv;
out float v_alpha;
void main() {
  float br = u_br.x * sin(u_br.y * 0.9 + a_sta.w) * 0.35;
  vec2 p = vec2(a_dyn.x - a_sta.x + br, a_dyn.y - a_sta.x - br) + a_corner * a_sta.y;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
  vec4 r = u_uv[int(a_sta.z)];
  v_uv = r.xy + a_corner * r.zw;
  v_alpha = a_dyn.z;
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_alpha;
uniform sampler2D u_tex;
out vec4 outColor;
void main() {
  outColor = texture(u_tex, v_uv) * v_alpha;
}`

interface GlCore {
  prog: WebGLProgram
  uRes: WebGLUniformLocation | null
  uBr: WebGLUniformLocation | null
  uUv: WebGLUniformLocation | null
  aCorner: number
  aDyn: number
  aSta: number
  vao: WebGLVertexArrayObject | null
  cornerBuf: WebGLBuffer | null
  staBuf: WebGLBuffer | null
  dynBuf: WebGLBuffer | null
}

function release(gl: WebGL2RenderingContext, c: GlCore): void {
  gl.deleteBuffer(c.cornerBuf)
  gl.deleteBuffer(c.staBuf)
  gl.deleteBuffer(c.dynBuf)
  gl.deleteVertexArray(c.vao)
  gl.deleteProgram(c.prog)
}

/** 编译 + 建缓冲 + 定混合状态。可重复调用（上下文恢复时重来一遍）。 */
function compile(gl: WebGL2RenderingContext): GlCore | null {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  if (!vs || !fs) return null
  gl.shaderSource(vs, VERT)
  gl.compileShader(vs)
  gl.shaderSource(fs, FRAG)
  gl.compileShader(fs)
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog)
    return null
  }
  const c: GlCore = {
    prog,
    uRes: gl.getUniformLocation(prog, 'u_res'),
    uBr: gl.getUniformLocation(prog, 'u_br'),
    uUv: gl.getUniformLocation(prog, 'u_uv[0]'),
    aCorner: gl.getAttribLocation(prog, 'a_corner'),
    aDyn: gl.getAttribLocation(prog, 'a_dyn'),
    aSta: gl.getAttribLocation(prog, 'a_sta'),
    vao: gl.createVertexArray(),
    cornerBuf: gl.createBuffer(),
    staBuf: gl.createBuffer(),
    dynBuf: gl.createBuffer(),
  }
  if (!c.vao || !c.cornerBuf || !c.staBuf || !c.dynBuf) {
    release(gl, c)
    return null
  }
  gl.bindVertexArray(c.vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, c.cornerBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(c.aCorner)
  gl.vertexAttribPointer(c.aCorner, 2, gl.FLOAT, false, 0, 0)
  // 每实例常量：half / quad / sprite / phase
  gl.bindBuffer(gl.ARRAY_BUFFER, c.staBuf)
  gl.bufferData(gl.ARRAY_BUFFER, 16, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(c.aSta)
  gl.vertexAttribPointer(c.aSta, 4, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(c.aSta, 1)
  // 每帧变量：x / y / alpha
  gl.bindBuffer(gl.ARRAY_BUFFER, c.dynBuf)
  gl.bufferData(gl.ARRAY_BUFFER, 12, gl.DYNAMIC_DRAW) // 占位，实际容量在每帧上传时定
  gl.enableVertexAttribArray(c.aDyn)
  gl.vertexAttribPointer(c.aDyn, 3, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(c.aDyn, 1)
  gl.bindVertexArray(null)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)
  gl.useProgram(prog)
  gl.uniform1i(gl.getUniformLocation(prog, 'u_tex'), 0)
  gl.useProgram(null)
  return c
}

function probeGl(): boolean {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 8
  const gl = c.getContext('webgl2', ATTRS)
  if (!gl) return false
  const core = compile(gl)
  if (!core) return false
  release(gl, core)
  return true
}

function createGl(canvas: HTMLCanvasElement): InkRenderer | null {
  const gl = canvas.getContext('webgl2', ATTRS)
  if (!gl) return null
  let gc = compile(gl)
  if (!gc) return null
  let sprites: readonly HTMLCanvasElement[] = []
  let uv = new Float32Array(12)
  let tex: WebGLTexture | null = null
  let statics = new Float32Array(0)
  let sCount = 0
  let dyn = new Float32Array(0)
  let lost = false

  // 图集：横排三档，格间 2px 透明边
  const buildAtlas = (): void => {
    if (sprites.length === 0) return
    const boxes: { x: number; y: number; w: number; h: number }[] = []
    let x = 2
    let h = 0
    for (const s of sprites) {
      boxes.push({ x, y: 2, w: s.width, h: s.height })
      x += s.width + 2
      if (s.height > h) h = s.height
    }
    const aw = x
    const ah = h + 4
    const at = document.createElement('canvas')
    at.width = aw
    at.height = ah
    const actx = at.getContext('2d')
    if (!actx) return
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      const s = sprites[i]
      if (b && s) actx.drawImage(s, b.x, b.y)
    }
    uv = new Float32Array(boxes.length * 4 > 12 ? boxes.length * 4 : 12)
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      if (!b) continue
      uv[i * 4] = b.x / aw
      uv[i * 4 + 1] = b.y / ah
      uv[i * 4 + 2] = b.w / aw
      uv[i * 4 + 3] = b.h / ah
    }
    if (tex) gl.deleteTexture(tex)
    tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // 画布内部就是预乘存储：保持预乘上载，片元侧才只需乘 alpha（与 Canvas2D 的 globalAlpha 同构）
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, at)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    // 精灵是**缩小**绘制的（12px 档画到约 6px）。Canvas2D 对缩小用的是面积平均，
    // 而 LINEAR 只取 4 个纹素、边缘会偏硬 —— 用 mipmap 三线性把缩小拉回面积平均的观感。
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  const uploadStatics = (P: readonly InkParticle[]): void => {
    const c = gc
    if (!c || !c.staBuf) return
    sCount = P.length
    if (statics.length < sCount * 4) statics = new Float32Array(sCount * 4)
    for (let i = 0; i < sCount; i++) {
      const p = P[i]
      if (!p) continue
      statics[i * 4] = p.half
      statics[i * 4 + 1] = p.quad
      statics[i * 4 + 2] = p.sprite
      statics[i * 4 + 3] = p.ph
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, c.staBuf)
    gl.bufferData(gl.ARRAY_BUFFER, statics.subarray(0, sCount * 4), gl.STATIC_DRAW)
  }

  const onLost = (e: Event): void => {
    e.preventDefault() // 允许浏览器稍后恢复上下文
    lost = true
  }
  const onRestored = (): void => {
    const c = compile(gl)
    if (!c) return
    gc = c
    lost = false
    buildAtlas()
    if (sCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, c.staBuf)
      gl.bufferData(gl.ARRAY_BUFFER, statics.subarray(0, sCount * 4), gl.STATIC_DRAW)
    }
    // 当前帧的 x/y/alpha 由下一次 draw 补上
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return {
    backend: 'webgl2',
    setSprites(s) {
      sprites = s
      buildAtlas()
    },
    setParticles(P) {
      uploadStatics(P)
    },
    draw(P, t, reduce) {
      const c = gc
      const n = P.length
      if (n === 0) {
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        return
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (!c || lost || !c.dynBuf) return
      if (dyn.length < n * 3) dyn = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const p = P[i]
        if (!p) continue
        dyn[i * 3] = p.x
        dyn[i * 3 + 1] = p.y
        dyn[i * 3 + 2] = alphaOf(p)
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, c.dynBuf)
      // 必须用 bufferData 而不是 bufferSubData：粒子数会随尺寸/机型变，而 bufferSubData 超出
      // 缓冲容量只会报 INVALID_VALUE 且**不扩容** —— 那样每帧上传都是空操作、全场 alpha 恒 0。
      // bufferData 顺带做了 orphan（换新存储再填），也避免了与上一帧的同步等待。
      gl.bufferData(gl.ARRAY_BUFFER, dyn.subarray(0, n * 3), gl.DYNAMIC_DRAW)
      gl.useProgram(c.prog)
      gl.uniform2f(c.uRes, canvas.width, canvas.height)
      gl.uniform2f(c.uBr, reduce ? 0 : 1, t)
      gl.uniform4fv(c.uUv, uv)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.bindVertexArray(c.vao)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n)
      gl.bindVertexArray(null)
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (tex) gl.deleteTexture(tex)
      if (gc) release(gl, gc)
      tex = null
      gc = null
    },
  }
}
