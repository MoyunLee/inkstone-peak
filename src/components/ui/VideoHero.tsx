import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * 视频位：放不出来就换成封面图 + 两个出口（**不再悄悄换成一张静态图**）。
 *
 * 三道判定：① error 事件；② 元数据到位但 videoWidth/Height 都是 0（部分浏览器不报错、只给空轨道）；
 * ③ 失败后由用户「重试」重新挂载（慢链路上一次失败往往是暂时的）。
 * 同时把封面当 poster：判定发生之前、以及无 JS 环境下也先显示封面，不会留黑框。
 * 触摸设备 preload=none：13MB 的片子不必在你点播放之前先偷偷下 moov（实测慢链路上一等就是十几秒）。
 *
 * ★2026-09-23 改（用户报「手机能放但加载一会就变成图片」）：旧实现把失败态渲染成一张裸封面图——
 *   用户既不知道发生了什么，也没有第二次机会。现在失败态 = 封面 + 「重试」+「用系统播放器打开」
 *   （后者直开 MP4 文件，交给手机自带播放器，它对渐进下载的耐心比网页播放器好）。
 *   另：②号判定的 0×0 不再当场判死，等 1.5s 复核一次（移动端 loadedmetadata 早于轨道信息有先例）。
 *
 * @param src 视频地址；为 null 时直接走静态图分支。
 * @param poster front-matter 声明的海报图（可选）。
 * @param cover 封面图，同时用作 poster 与失败回落的图源。
 * @param controls true=显示原生控件且不自动播；false=静音循环自动播。
 * @param label 视频的 aria-label；缺省用 title。
 * @param title 兜底图片的 alt，同时是视频的默认可访问名。
 * @param fallback 既没有封面也没有 poster 时的兜底内容（通常是印章占位）。
 * @param retryLabel 失败态「重试」按钮文字（site.yml a11y）。
 * @param openLabel 失败态「用系统播放器打开」文字（site.yml a11y）。
 * @example
 * <VideoHero src={w.video.src} cover={w.cover} controls={w.video.controls === true} title={w.title} />
 */
export default function VideoHero({
  src,
  poster,
  cover,
  controls,
  label,
  title,
  fallback,
  retryLabel,
  openLabel,
}: {
  src: string | null
  poster?: string | null
  cover?: string | null
  controls: boolean
  label?: string
  title: string
  /** 既没有封面也没有 poster 时兜底渲染（通常是印章占位）。 */
  fallback?: ReactNode
  /** 失败态重试按钮文字（site.yml a11y）。 */
  retryLabel?: string
  /** 失败态直开文件的出口文字（site.yml a11y）。 */
  openLabel?: string
}) {
  const [failed, setFailed] = useState(false)
  const [nonce, setNonce] = useState(0)
  const elRef = useRef<HTMLVideoElement | null>(null)
  const still = cover ?? poster ?? null
  const touch = typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches)
  if (failed || !src) {
    if (!still) return <>{fallback ?? null}</>
    return (
      <div className="vh">
        <img className="vh-cover" src={still} alt={title} decoding="async" />
        {src ? (
          <div className="vh-acts">
            <button
              type="button"
              className="vh-act"
              onClick={() => { setFailed(false); setNonce((n) => n + 1) }}
            >
              {retryLabel ?? ''}
            </button>
            <a className="vh-act" href={src} target="_blank" rel="noopener noreferrer">{openLabel ?? ''}</a>
          </div>
        ) : null}
      </div>
    )
  }
  return (
    <video
      key={nonce}
      ref={elRef}
      src={src}
      poster={still ?? undefined}
      controls={controls}
      autoPlay={!controls}
      muted={!controls}
      loop={!controls}
      playsInline
      preload={touch ? 'none' : 'metadata'}
      aria-label={label ?? title}
      onError={() => setFailed(true)}
      onLoadedMetadata={(e) => {
        const el = e.currentTarget
        if (el.videoWidth > 0 || el.videoHeight > 0) return
        // 空轨道复核：1.5s 后还是 0×0 才判死（移动端 loadedmetadata 早于轨道信息有先例）
        window.setTimeout(() => {
          if (elRef.current === el && el.videoWidth === 0 && el.videoHeight === 0) setFailed(true)
        }, 1500)
      }}
    />
  )
}
