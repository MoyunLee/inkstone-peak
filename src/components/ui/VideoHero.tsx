import { useState } from 'react'
import type { ReactNode } from 'react'

/**
 * 视频位：放不出来就换成封面图（典型场景：H.265/HEVC 在 Chrome/Edge/Firefox 解不了）。
 *
 * 两道判定：① error 事件；② 元数据到位但 videoWidth/Height 都是 0（部分浏览器不报错、只给空轨道）。
 * 同时把封面当 poster：判定发生之前、以及无 JS 环境下也先显示封面，不会留黑框。
 * 纯静态站的前端兜底——真正的修法仍是重导成 H.264（见 DEPLOY / checklist 的媒体提醒）。
 *
 * @param src 视频地址；为 null 时直接走静态图分支。
 * @param poster front-matter 声明的海报图（可选）。
 * @param cover 封面图，同时用作 poster 与失败回落的图源。
 * @param controls true=显示原生控件且不自动播；false=静音循环自动播。
 * @param label 视频的 aria-label；缺省用 title。
 * @param title 兜底图片的 alt，同时是视频的默认可访问名。
 * @param fallback 既没有封面也没有 poster 时的兜底内容（通常是印章占位）。
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
}: {
  src: string | null
  poster?: string | null
  cover?: string | null
  controls: boolean
  label?: string
  title: string
  /** 既没有封面也没有 poster 时兜底渲染（通常是印章占位）。 */
  fallback?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const still = cover ?? poster ?? null
  if (failed || !src) {
    if (still) return <img src={still} alt={title} decoding="async" />
    return <>{fallback ?? null}</>
  }
  return (
    <video
      src={src}
      poster={still ?? undefined}
      controls={controls}
      autoPlay={!controls}
      muted={!controls}
      loop={!controls}
      playsInline
      preload="metadata"
      aria-label={label ?? title}
      onError={() => setFailed(true)}
      onLoadedMetadata={(e) => {
        const el = e.currentTarget
        if (el.videoWidth === 0 && el.videoHeight === 0) setFailed(true)
      }}
    />
  )
}
