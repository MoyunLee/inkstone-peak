import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMotionSafe } from '../../lib/hooks/useMotionSafe'
import { HERO_SIZES } from '../../lib/data/images'
import RespImg from './RespImg'

export interface CarouselItem {
  key: string
  /** 画面里不出文字，此值仅供链接的可访问名与圆点 aria-label。 */
  title: string
  to: string
  /** 封面：铺满整张幻灯片。没图就不要进轮播（由调用方过滤）。 */
  cover?: string | null
}
export interface CarouselLabels {
  prev?: string
  next?: string
}

/**
 * 通用淡入淡出轮播：任何页面喂 items 即可挂载。
 *
 * 少于 2 张时不渲染箭头与圆点；鼠标悬停暂停自动播放；prefers-reduced-motion 命中时完全不自动播。
 *
 * @param items 幻灯片清单；没有 cover 的项请调用方先过滤掉。
 * @param labels 箭头按钮的可访问名（取自 site.yml a11y）。
 * @param intervalMs 自动播放间隔，默认 5000ms。
 * @param className 追加到根节点的类名。
 * @example
 * <FadeCarousel
 *   items={works.map((w) => ({ key: w.slug, title: w.title, to: w.to, cover: w.cover }))}
 *   labels={{ prev: a.carousel_prev, next: a.carousel_next }}
 * />
 */
export default function FadeCarousel({
  items,
  labels,
  intervalMs = 5000,
  className = '',
}: {
  items: CarouselItem[]
  labels: CarouselLabels
  intervalMs?: number
  className?: string
}) {
  const reduceMotion = useMotionSafe()
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = items.length
  const go = (i: number): void => setIdx(((i % n) + n) % n)
  useEffect(() => {
    if (reduceMotion || paused || n < 2) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % n), intervalMs)
    return () => window.clearInterval(t)
  }, [reduceMotion, paused, n, intervalMs])
  if (n === 0) return null
  return (
    <div
      className={`fade-carousel${className !== '' ? ' ' + className : ''}${items[idx]?.cover ? ' has-photo' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="fc-stage">
        {items.map((it, i) => (
          <Link
            key={it.key}
            to={it.to}
            className={`fc-slide${i === idx ? ' on' : ''}`}
            aria-hidden={i !== idx}
            tabIndex={i === idx ? 0 : -1}
            aria-label={it.title}
          >
            {it.cover ? <RespImg className="fc-img" src={it.cover} sizes={HERO_SIZES} eager /> : null}
          </Link>
        ))}
      </div>
      {n > 1 ? (
        <>
          <button type="button" className="fc-arrow prev" aria-label={labels.prev} onClick={() => go(idx - 1)}>{'\u2039'}</button>
          <button type="button" className="fc-arrow next" aria-label={labels.next} onClick={() => go(idx + 1)}>{'\u203A'}</button>
          <div className="fc-dots">
            {items.map((it, i) => (
              <button
                key={it.key}
                type="button"
                className={i === idx ? 'fc-dot on' : 'fc-dot'}
                aria-label={it.title}
                aria-current={i === idx ? 'true' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
