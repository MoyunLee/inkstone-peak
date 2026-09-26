import { srcSetOf } from '../../lib/data/images'

/**
 * 响应式图（2026-09-26）：全站 `<img>` 的唯一出口。
 *
 * `srcSet` 由构建期清单（.content/images.json）给——母版一张，交付时按需多档；
 * `sizes` 由调用方按**容器几何**给（口径住 src/lib/data/images.ts 的 HERO_SIZES / CARD_SIZES_2 / CARD_SIZES_3）。
 * 两者缺一不可：只给 srcSet 而不给 sizes，浏览器按 100vw 猜，等于白分档。
 *
 * `data-full` 只记母版地址：点图放大层要的是**最大那一档**，而 `currentSrc` 给的是浏览器
 * 实际选中的小档（见 Lightbox 的打开处）。
 *
 * @param src 交付地址（front-matter 归一后的 cover / top_img / video.poster）。
 * @param sizes 容器几何口径。
 * @param className 皮肤类名。
 * @param alt 内容图给描述；装饰图留空（默认）——卡片的链接名由标题文字给，免读屏重复念一遍。
 * @param eager true = 首屏内不延迟（顶图槽）；缺省 lazy（列表卡 / 正文分节）。
 * @example
 * <RespImg className="fc-img" src={it.cover} sizes={HERO_SIZES} eager />
 * <RespImg src={entry.cover} sizes={CARD_SIZES_3} />
 */
export default function RespImg({
  src,
  sizes,
  className,
  alt = '',
  eager = false,
}: {
  src: string
  sizes: string
  className?: string
  alt?: string
  eager?: boolean
}) {
  const srcSet = srcSetOf(src)
  return (
    <img
      className={className}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={eager ? undefined : 'lazy'}
      decoding="async"
      data-full={srcSet ? src : undefined}
    />
  )
}
