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
// 推迟期间看到的是预烘静态底图 source/site/hero-base.png（与引擎同一份 scene-data 生成，即终态画面）。
const INK_START_DEADLINE_MS = 3000 // 天花板而非下限：load 迟迟不来（某资源卡住）时到点强制进入空闲等待；桌面端根本不会触发
// 空闲等待上限：进入空闲等待后最多再等这么久就强制启动；无 rIC 的回退路径用同一个延迟。
const INK_IDLE_TIMEOUT_MS = 500

export default function Hero() {
  const site = useSite()
  const sec = sectionById(site, 'home')
  const lines = sec?.heading_lines ?? (sec?.heading ? [sec.heading] : [])
  const ctas = sec?.cta ?? []
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let dispose: (() => void) | null = null
    let cancelled = false
    let cancelIdle: () => void = () => {}
    let deadline = 0 // 等 load 的截止线；挂载时已在 complete 态则保持 0（clearTimeout(0) 是 no-op）
    let armed = true // 触发链是否待命：挡住「截止线先到、load 后到」造成的二次排期

    // 真正的代价在动态 import + 引擎初始化这一层，所以两者一起推迟到触发链之后执行。
    // import 是异步的：回到 then 时若已卸载，直接放弃，绝不在卸载后碰画布。
    const startInk = (): void => {
      void import('../../fx/ink-field').then((m) => {
        if (cancelled) return
        dispose = m.createInkField(c)
      })
    }
    // 空闲等待：requestIdleCallback 并非所有环境都有（Safari 15.4 之前没有，至今仍未普遍支持），
    // 缺失时回退到 setTimeout——语义退化为「load 后再等 INK_IDLE_TIMEOUT_MS」，行为仍然正确，零依赖。
    const scheduleIdle = (): void => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(startInk, { timeout: INK_IDLE_TIMEOUT_MS })
        cancelIdle = () => window.cancelIdleCallback(id)
      } else {
        const id = window.setTimeout(startInk, INK_IDLE_TIMEOUT_MS)
        cancelIdle = () => window.clearTimeout(id)
      }
    }
    // 唯一触发入口：load 与截止线都走这里，armed 保证只排期一次。
    const arm = (): void => {
      if (!armed || cancelled) return
      armed = false
      window.clearTimeout(deadline) // 截止线已无意义
      window.removeEventListener('load', arm) // 摘掉 load 监听（once 之外再兜一次）
      scheduleIdle()
    }
    // load 可能早于本次挂载就已发生（客户端二次进入 / 水合晚于 load）：readyState 已 complete 就直接进
    // 空闲等待，漏不掉也不必监听；否则听 load，并用 INK_START_DEADLINE_MS 当天花板兜住卡死的资源。
    if (document.readyState === 'complete') arm()
    else {
      deadline = window.setTimeout(arm, INK_START_DEADLINE_MS)
      window.addEventListener('load', arm, { once: true })
    }

    return () => {
      // ① 还没开始：关掉触发链，并把新增的监听 / 截止线 / 空闲回调一起撤干净
      cancelled = true
      armed = false
      window.clearTimeout(deadline)
      window.removeEventListener('load', arm)
      cancelIdle()
      // ② 已经启动：交还 ink-field 自己的 dispose（rAF、事件监听、观察器都在它里面收口）
      dispose?.()
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
