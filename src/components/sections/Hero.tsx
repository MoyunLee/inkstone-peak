/* S1 山门：左对齐内容块 + 横排两行；两枚 CTA=SealButton chip-a/chip-b。 */
import { useEffect, useRef } from 'react'
import SealButton from '../ui/SealButton'
import { sectionById, useSite } from '../../lib/data/site'

// 启动触发点 = window 'load'，而不是恒定时间下限。这是整段代码最容易被后人「优化」掉的地方，
// 理由必须留在这里：
//   · 结构性成立（严格版，只承诺能证明的）：LCP 元素 .mist.a 的背景图就是 /mist-a.webp，浏览器不可能
//     在这张图下载完成前把它画出来；而 load 要等所有急切子资源（含这张图）到齐才发。所以 load 之后
//     启动，**不可能再与 LCP 那张图抢下载/解码**——注意这**不等于**「必然晚于 LCP 绘制」：桌面端
//     load≈0.2s 反而早于 LCP≈0.6s（LCP 在桌面是渲染瓶颈而非下载瓶颈），但它 CPU 无节流、余量充足，
//     且相对「挂载瞬间即启动」仍是严格改进。
//   · 自适应：慢 4G 上 load 还要排在其余急切子资源之后（实测 2.5s+），自然落到 LCP（2.6–3.2s）之后；
//     快设备几乎无感。恒定下限（曾用 2600ms）对慢设备是对的，对桌面端却是纯粹的回退——桌面 LCP 实测
//     仅 0.6s，会被硬生生推迟约 2s，属于改变原有显示效果，故弃用。
//   · 再叠一层：requestIdleCallback 只在「本帧渲染完之后还有余力」时才回调，所以引擎**必然在至少一次
//     绘制之后**才起步——React 首次提交引起的那次 LCP 重绘因此不会被它顶掉。
//   · 比 PerformanceObserver 观察 LCP 更简单、代码路径更少，且 Safari 不支持 LCP 观测，仍需回退。
// 推迟期间山门只有纸底 + 云雾：预烘底图 source/site/hero-base.png 只服务 <noscript> 降级，
// 运行期没有任何地方画它。
const INK_START_DEADLINE_MS = 3000 // 天花板而非下限：load 迟迟不来（某资源卡住）时到点强制进入空闲等待；桌面端根本不会触发
// 空闲等待上限：进入空闲等待后最多再等这么久就强制启动；无 rIC 的回退路径用同一个延迟。
const INK_IDLE_TIMEOUT_MS = 500

// ★水墨三档：**手机端没有水墨 · 平板端只有静态水墨 · 桌面端才是动态**。
//   · 手机（触屏 且 设备短边 <640，含横屏手机）：连触发链都不进——动态 import 与引擎初始化都不发生，
//     全站最重的那段（4× CPU 节流实测 4116ms 主线程）在手机上直接不存在。
//   · 平板（触屏，或视口 ≤1023px 的窄窗口）：引擎照常建场，但只成画一帧——不启动 rAF、不挂指针事件。
//   · 桌面（>1023px 且主指针精细）：live 动效。
// 两处口径有意与别处不同，理由留在这里：
//   · 触屏用 (pointer: coarse)，而不是 EmbedHero / VideoHero 那套 maxTouchPoints>0——那边问的是「能不能
//     摸」，这里问的是「有没有真正的悬停与精细指针」：带鼠标的触屏笔记本主指针仍是精细指针，不算平板。
//   · 手机按「设备短边」而不是宽度：横屏手机宽 844px，按宽度判会被当成平板。
//   · CSS 侧（hero.css / layout.css）各有一条**同口径**的兜底，改这里必须同步改那两处。
const INK_COARSE_QUERY = '(pointer: coarse)'
const INK_PHONE_SHORT_EDGE = 640
const INK_TABLET_MAX_W = 1023

type InkMode = 'none' | 'still' | 'live' // 手机（无水墨）/ 平板（静态水墨）/ 桌面（动效）
type InkActiveMode = Exclude<InkMode, 'none'>
const inkMode = (): InkMode => {
  const coarse = window.matchMedia(INK_COARSE_QUERY).matches
  if (coarse && Math.min(window.innerWidth, window.innerHeight) < INK_PHONE_SHORT_EDGE) return 'none'
  return coarse || window.innerWidth <= INK_TABLET_MAX_W ? 'still' : 'live'
}

export default function Hero() {
  const site = useSite()
  const sec = sectionById(site, 'home')
  const lines = sec?.heading_lines ?? (sec?.heading ? [sec.heading] : [])
  const ctas = sec?.cta ?? []
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let mode: InkMode | null = null // 已生效的档位（null＝还没同步过）
    let dispose: (() => void) | null = null // 引擎的收尾：rAF / 监听 / 观察器 / 位图都在它里面收口
    let cancelIdle: () => void = () => {}
    let deadline = 0 // 等 load 的截止线；readyState 已 complete 时保持 0（clearTimeout(0) 是 no-op）
    let onLoad: (() => void) | null = null // 触发链挂过的 load 监听（换档时要摘掉）
    let armed = false // 触发链是否待命：挡住「截止线先到、load 后到」造成的二次排期
    let dead = false // 整个 effect 已卸载：异步回到 then 时据此放弃

    // 真正的代价在动态 import + 引擎初始化这一层，所以两者一起推迟到触发链之后执行。
    // import 是异步的：回到 then 时若已卸载、或档位又变了，直接放弃，绝不在卸载后碰画布。
    const startInk = (want: InkActiveMode): void => {
      void import('../../fx/ink-field').then((m) => {
        if (dead || mode !== want) return
        dispose = m.createInkField(c, { still: want === 'still' })
      })
    }
    // 空闲等待：requestIdleCallback 并非所有环境都有（Safari 15.4 之前没有，至今仍未普遍支持），
    // 缺失时回退到 setTimeout——语义退化为「load 后再等 INK_IDLE_TIMEOUT_MS」，行为仍然正确，零依赖。
    const scheduleIdle = (want: InkActiveMode): void => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => startInk(want), { timeout: INK_IDLE_TIMEOUT_MS })
        cancelIdle = () => window.cancelIdleCallback(id)
      } else {
        const id = window.setTimeout(() => startInk(want), INK_IDLE_TIMEOUT_MS)
        cancelIdle = () => window.clearTimeout(id)
      }
    }
    // 唯一触发入口：load 与截止线都走这里，armed 保证只排期一次。
    const arm = (want: InkActiveMode): void => {
      if (!armed || dead) return
      armed = false
      window.clearTimeout(deadline) // 截止线已无意义
      if (onLoad) {
        window.removeEventListener('load', onLoad) // 摘掉 load 监听（once 之外再兜一次）
        onLoad = null
      }
      scheduleIdle(want)
    }
    // 收工：撤掉触发链，再交还 ink-field 自己的 dispose（rAF、事件监听、观察器、位图都在它里面收口）
    const stop = (): void => {
      armed = false
      window.clearTimeout(deadline)
      if (onLoad) {
        window.removeEventListener('load', onLoad)
        onLoad = null
      }
      cancelIdle()
      dispose?.()
      dispose = null
    }
    // 档位随时可能变：视口宽度、触屏能力（二合一笔记本拆键盘 / 接显示器、平板旋转）都会变。
    // 只在挂载时判一次会留下两种死档——「画布已被 CSS 藏了、引擎还在空转」与「窗口拉宽了也永远没有水墨」。
    // 所以每次变化都重判：先把旧档 stop 干净，再按新档起步（重建成本＝一次已缓存的 import + 一帧）。
    const sync = (): void => {
      const next = inkMode()
      if (next === mode) return
      mode = next
      stop()
      if (next === 'none') return // 手机端：画布保持空（透明），不 import、不初始化
      armed = true
      // load 可能早于本次挂载就已发生（客户端二次进入 / 后续改档）：readyState 已 complete 就直接进空闲
      // 等待，漏不掉也不必监听；否则听 load，并用 INK_START_DEADLINE_MS 当天花板兜住卡死的资源。
      if (document.readyState === 'complete') arm(next)
      else {
        onLoad = () => arm(next)
        deadline = window.setTimeout(() => arm(next), INK_START_DEADLINE_MS)
        window.addEventListener('load', onLoad, { once: true })
      }
    }

    sync()
    window.addEventListener('resize', sync)
    const coarse = window.matchMedia(INK_COARSE_QUERY)
    coarse.addEventListener('change', sync) // 触屏能力本身也会变（拆键盘 / 接显示器），宽度监听盖不住

    return () => {
      dead = true
      window.removeEventListener('resize', sync)
      coarse.removeEventListener('change', sync)
      stop()
    }
  }, [])
  return (
    <section id="home" className="section-full hero">
      <canvas ref={canvasRef} id="ink" aria-hidden="true" />
      <div className="mist a" aria-hidden="true" />
      <div className="mist b" aria-hidden="true" />
      <div className="hero-copy">
        <h1>
          {lines.map((l) => (
            <span key={l} className="hero-line">
              {l}
            </span>
          ))}
        </h1>
        <div className="hero-cta">
          {ctas.map((c, i) => (
            <SealButton key={c.label} to={c.to} chip={i === 0 ? 'a' : 'b'}>
              {c.label}
            </SealButton>
          ))}
        </div>
      </div>
    </section>
  )
}
