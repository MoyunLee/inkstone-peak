import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'
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
interface CarouselLabels {
  /** 上一张（缺了就只剩一个「‹」字形当名字，勉强能读）。 */
  prev?: string
  next?: string
  /** 暂停键的可访问名（rotation 正在跑时用）。**与 play 成对**：缺任一个就不渲染这个键。 */
  pause?: string
  /** 播放键的可访问名（rotation 已停时用）。与 pause 成对。 */
  play?: string
}

/**
 * 首屏到「下一张预热」之间的等待：越短越早占带宽，越长首屏越干净。
 * 取 min(这个值, intervalMs/2)——5s 档下 = 2.5s，首屏窗口里只发当前这一张，
 * 剩下的 2.5s 足够下一张落地，切到它时不空帧（见 D8 的实测记录）。
 */
const WARM_MAX_MS = 2500

/**
 * 通用淡入淡出轮播：任何页面喂 items 即可挂载。
 *
 * 自动播放受四道闸控制，任一命中即停：① prefers-reduced-motion（**永久**，用户按播放也不起）；
 * ② 用户主开关（暂停键，或点头/箭头手动翻页——手动操作过就不再自动播）；③ 悬停或键盘焦点在轮播内（临时）；
 * ④ 不足 2 张。暂停键的文案由 site.yml a11y 的 carousel_pause / carousel_play 给。
 *
 * ★闸③ 有一个例外：按「播放」会把 hold 一并清掉（显式意图优先）⇒ **指针或焦点还在轮播里时也会转起来**，
 *   要重新冻住得先移出去再进来。这是刻意的取舍：不清 hold 的话，Tab 到按钮的键盘用户按下播放毫无反应（死键），
 *   而「按了播放却在悬停中」只是少见且可自解的情况。
 *
 * 图片按「热集」挂载：只有当前这张 + 已经走过/即将上场的那张才真的发请求，其余幻灯片只留链接壳。
 * 这样 **首屏只有 1 个轮播图请求**——注意光写 loading=lazy 是不够的：幻灯片都绝对定位在首屏里，
 * 浏览器照样认为它们在视口内；而且 SSR 还会给非 lazy 的图预先发 `<link rel=preload as=image>`。
 *
 * @param items 幻灯片清单；没有 cover 的项请调用方先过滤掉。
 * @param labels 箭头 + 暂停/播放按钮的可访问名（取自 site.yml a11y）。
 * @param intervalMs 自动播放间隔，默认 5000ms。
 * @param className 追加到根节点的类名。
 * @example
 * <FadeCarousel
 *   items={works.map((w) => ({ key: w.slug, title: w.title, to: w.to, cover: w.cover }))}
 *   labels={{ prev: a.carousel_prev, next: a.carousel_next, pause: a.carousel_pause, play: a.carousel_play }}
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
  /** 用户主开关：按过暂停键、或手动翻过页 = true（此后不再自动播，直到按播放）。 */
  const [stopped, setStopped] = useState(false)
  /** 临时暂停：鼠标悬停在轮播上、或键盘焦点落在轮播里。 */
  const [hold, setHold] = useState(false)
  /** 热集：已经挂了 <img> 的幻灯片下标（只增不减，保证淡出时旧图还在）。 */
  const [warm, setWarm] = useState<ReadonlySet<number>>(() => new Set([0]))
  const n = items.length
  const go = (i: number): void => setIdx(((i % n) + n) % n)
  const rotating = !reduceMotion && !stopped && !hold && n > 1
  useEffect(() => {
    if (!rotating) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % n), intervalMs)
    return () => window.clearInterval(t)
  }, [rotating, n, intervalMs])
  // 当前这张一上场就进热集：点圆点/箭头可能直接跳到还没预热的那张。
  useEffect(() => {
    setWarm((s) => (s.has(idx) ? s : new Set(s).add(idx)))
  }, [idx])
  // 预热下一张：等一会儿再挂，首屏窗口里就只留当前这一张的请求。
  useEffect(() => {
    if (n < 2) return
    const next = (idx + 1) % n
    if (warm.has(next)) return
    const t = window.setTimeout(() => setWarm((s) => new Set(s).add(next)), Math.min(WARM_MAX_MS, intervalMs / 2))
    return () => window.clearTimeout(t)
  }, [idx, n, warm, intervalMs])
  if (n === 0) return null
  return (
    <div
      className={`fade-carousel${className !== '' ? ' ' + className : ''}${items[idx]?.cover ? ' has-photo' : ''}`}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false) }}
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
            {it.cover && warm.has(i) ? <RespImg className="fc-img" src={it.cover} sizes={HERO_SIZES} eager={i === idx} /> : null}
          </Link>
        ))}
      </div>
      {n > 1 ? (
        <>
          <button type="button" className="fc-arrow prev" aria-label={labels.prev} onClick={() => { setStopped(true); go(idx - 1) }}>{'\u2039'}</button>
          <button type="button" className="fc-arrow next" aria-label={labels.next} onClick={() => { setStopped(true); go(idx + 1) }}>{'\u203A'}</button>
          <div className="fc-dots">
            {items.map((it, i) => (
              <button
                key={it.key}
                type="button"
                className={i === idx ? 'fc-dot on' : 'fc-dot'}
                aria-label={it.title}
                aria-current={i === idx ? 'true' : undefined}
                onClick={() => { setStopped(true); go(i) }}
              />
            ))}
          </div>
          {/* WCAG 2.2.2 的停机键：文案换名（不叠 aria-pressed——按钮名已在说下一步动作，
              再叠「已按下」会让读屏念出「播放…已按下」这种自相矛盾的状态）。
                名字缺一个就整个不渲染：这个键的可见内容是一枚 aria-hidden 的图标，没有名字时读屏只会报「按钮」，
                宁可不给，也不给一个无名控件（箭头有「‹ ‹」字形兜底，这里没有）。 */}
          {labels.pause && labels.play ? (
            <button
              type="button"
              className="fc-toggle"
              aria-label={stopped ? labels.play : labels.pause}
              onClick={() => {
                if (!stopped) { setStopped(true); return }
                // 显式按播放＝用户意图优先：连「悬停/焦点临时停」一起清掉，否则按了也不动。
                setHold(false)
                setStopped(false)
              }}
            >
              {stopped ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
