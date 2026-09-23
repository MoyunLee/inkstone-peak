import { useEffect, useRef, useState } from 'react'
import { EMBED_ATTRS, EMBED_ATTRS_HERO } from '../../lib/data/embed'

/** 播放器多久没 load 就当「这台浏览器 / 这条链路放不出来」，退回海报（毫秒）。 */
const GIVE_UP_MS = 15000

/**
 * 触摸设备（手机 / 平板）判定。
 *
 * 用 maxTouchPoints 而不是媒体查询：手机自带浏览器里 `(hover: none)` 有报错的先例，
 * 而 maxTouchPoints 在哪儿都诚实。服务端（预渲染）无 window → 一律当作非触摸，
 * 于是**爬虫与桌面拿到的是带 iframe 的版本**，手机在客户端首次渲染就换成海报 + 框下出口。
 *
 * @returns true = 触摸设备。
 */
function isTouch(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches
}

/**
 * 嵌入位（顶图槽与嵌入分节共用）：**手机先出海报，框下常驻一行出口**。
 *
 * 为什么不是直接塞 iframe（2026-09-23 用户报「手机完全播放不了、图也没有」后改）：
 *   ① 封面是我们自己的图，一定画得出来；第三方 iframe 在部分手机自带浏览器里整块拦掉——
 *      于是那 16/9 槽位是**空白**，用户既看不到内容也不知道还能怎么办；
 *   ② 播放器文档几百 KB，慢链路上要等很久才出画面，先出海报至少先给一张脸；
 *   ③ 点一下是**真实用户手势**，播放器起播与授权都更顺。
 *
 * 出口为什么在**框下**而不是框角浮层：iframe 被拦时浏览器照样会报 load（Chromium 会载入错误页），
 * 靠事件判「播放器到底出没出画面」判不出来（实测 `.em-out-live` 版本 0.6s 就误判成就绪）。
 * 框下这一行不遮播放器控件、两种状态下都在，是唯一可靠的兜底——手机点它通常直接唤起 App。
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
  // 触摸与否一次算定（客户端首渲即可判；服务端按非触摸走，爬虫拿到的仍是 iframe 版）
  const [touch] = useState<boolean>(() => isTouch())
  const [armed, setArmed] = useState<boolean>(() => !isTouch())
  const [failed, setFailed] = useState(false)
  const ok = useRef(false)
  const out = external ?? url

  // 装了播放器还不 load：判它放不出来，退回海报（只有用户点过才计时，桌面不受影响）
  useEffect(() => {
    if (!armed || failed) return
    const t = window.setTimeout(() => { if (!ok.current) setFailed(true) }, GIVE_UP_MS)
    return () => window.clearTimeout(t)
  }, [armed, failed])

  const box = !armed || failed ? (
    <div className="em">
      {cover ? <img className="em-cover" src={cover} alt="" decoding="async" /> : <span className="em-cover" aria-hidden="true" />}
      <button
        type="button"
        className="em-play"
        aria-label={texts.play}
        onClick={() => { ok.current = false; setFailed(false); setArmed(true) }}
      >
        <span className="em-tri" aria-hidden="true" />
      </button>
      {failed ? <p className="em-note">{texts.failed}</p> : null}
    </div>
  ) : (
    <iframe
      src={url}
      title={label}
      {...(hero ? EMBED_ATTRS_HERO : EMBED_ATTRS)}
      onLoad={() => { ok.current = true }}
    />
  )

  return (
    <>
      {hero ? <div className={'bd-hero' + (touch ? ' has-below' : '')}>{box}</div> : box}
      {touch ? (
        <p className="em-below">
          <a href={out} target="_blank" rel="noopener noreferrer">{texts.external}</a>
        </p>
      ) : null}
    </>
  )
}
