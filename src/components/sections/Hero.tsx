/* S1 山门：左对齐内容块 + 横排两行；两枚 CTA=SealButton chip-a/chip-b。 */
import { useEffect, useRef } from 'react'
import SealButton from '../ui/SealButton'
import { sectionById, useSite } from '../../lib/data/site'

export default function Hero() {
  const site = useSite()
  const sec = sectionById(site, 'home')
  const lines = sec?.heading_lines ?? (sec?.heading ? [sec.heading] : [])
  const ctas = sec?.cta ?? []
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let dispose = (): void => {}
    let cancelled = false
    void import('../../fx/ink-field').then((m) => {
      if (cancelled) return
      dispose = m.createInkField(c)
    })
    return () => {
      cancelled = true
      dispose()
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
