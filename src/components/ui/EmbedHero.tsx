import { useEffect, useRef, useState } from 'react'
import { EMBED_ATTRS, EMBED_ATTRS_HERO } from '../../lib/data/embed'

/** 桌面端播放器多久没 load 就当放不出来，退回海报 + 说明里的出口（毫秒）。 */
const GIVE_UP_MS = 15000

/**
 * 触摸设备（手机 / 平板）判定。
 *
 * 用 maxTouchPoints 而不是媒体查询：手机自带浏览器里 `(hover: none)` 有报错的先例。
 * 服务端（预渲染）无 window → 一律当作非触摸，于是**爬虫与桌面拿到的是带 iframe 的版本**。
 *
 * @returns true = 触摸设备。
 */
function isTouch(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches
}

/**
 * 嵌入位（顶图槽与嵌入分节共用）：**手机上封面即入口（点它去平台），桌面才在本站装播放器**。
 *
 * 为什么分家（2026-09-23 用户手机实测两轮后定案）：
 *   手机自带浏览器会把第三方 iframe **整块拦掉**——16/9 槽位空白，既看不到内容也不知道还能怎么办；
 *   实测确认：封面（我们自己的图）画得出来、出口能唤起 App，唯独站内播放器一个像素都进不来。
 *   于是手机这一档不再装作「本站能播」：封面 + 播放环 + 「新窗口观看」是**同一个链接**，点哪儿都去平台页
 *   （手机上通常直接唤起 App）。宁可少一个能力，也不给用户一个点了没反应的播放器。
 * 桌面不受影响：直接出 iframe；真放不出来（15s 没 load）才退回海报，说明里带出口。
 *
 * @param url 播放器地址（已过白名单）。
 * @param label 可访问名（iframe title）。
 * @param cover 海报图（顶图槽用文章封面；没有就退成纸色块）。
 * @param external 出口地址（优先平台页，没有就用播放器地址）。
 * @param texts 三个话术（site.yml a11y：播放 / 新窗口 / 没加载出来）。
 * @param hero true=顶图槽（自己渲染 .bd-hero 定比壳并 eager 加载），false=正文分节（lazy）。
 * @example
 * <EmbedHero url={e.url} label={e.label} cover={entry.cover} external={entry.links?.[0]?.url} texts={{...}} hero />
 */
export default function EmbedHero({
  url,
  label,
  cover,
  external,
  texts,
  hero = false,
}: {
  url: string
  label: string
  cover?: string | null
  external?: string | null
  texts: { play: string; external: string; failed: string }
  hero?: boolean
}) {
  // 触摸与否一次算定（客户端首渲即可判；服务端按非触摸走）
  const [touch] = useState<boolean>(() => isTouch())
  const [armed, setArmed] = useState<boolean>(() => !isTouch())
  const [failed, setFailed] = useState(false)
  const ok = useRef(false)
  const out = external ?? url

  // 只有桌面这一档会装播放器，故只有它需要「迟迟不 load」的兜底
  useEffect(() => {
    if (touch || !armed || failed) return
    const t = window.setTimeout(() => { if (!ok.current) setFailed(true) }, GIVE_UP_MS)
    return () => window.clearTimeout(t)
  }, [touch, armed, failed])

  const poster = (
    <div className="em">
      {cover ? <img className="em-cover" src={cover} alt="" decoding="async" /> : <span className="em-cover" aria-hidden="true" />}
      {touch ? (
        <a className="em-play" href={out} target="_blank" rel="noopener noreferrer">
          <span className="em-orb"><span className="em-tri" aria-hidden="true" /></span>
          <span className="em-cta">{texts.external}</span>
        </a>
      ) : (
        <button
          type="button"
          className="em-play"
          aria-label={texts.play}
          onClick={() => { ok.current = false; setFailed(false); setArmed(true) }}
        >
          <span className="em-orb"><span className="em-tri" aria-hidden="true" /></span>
        </button>
      )}
      {!touch && failed ? (
        <p className="em-note">
          {texts.failed}{' '}
          <a href={out} target="_blank" rel="noopener noreferrer">{texts.external}</a>
        </p>
      ) : null}
    </div>
  )

  const box = !armed || failed ? poster : (
    <iframe
      src={url}
      title={label}
      {...(hero ? EMBED_ATTRS_HERO : EMBED_ATTRS)}
      onLoad={() => { ok.current = true }}
    />
  )

  return hero ? <div className="bd-hero">{box}</div> : box
}
