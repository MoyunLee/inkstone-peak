// 封面多档的只读源：.content/images.json 由构建期生成（scripts/media.ts 调 scripts/srcset.ts 出）。
// 运行层只做一件事——把「一张母版」翻成 srcset；档位与宽度全在构建期定死，这里零推理。
import manifestJson from '../../../.content/images.json'
import type { ImageManifest } from '../types/images'

export type { ImageManifest, ImageVariant, ResponsiveImage } from '../types/images'

// as unknown as 只因 JSON 导入会把字面量拓宽成 string；清单与产物的对账由构建期负责（同一份清单两处共用）。
const manifest = manifestJson as unknown as ImageManifest

/**
 * 取一张母版的 srcset 串。**返回 undefined 就是别写 `srcSet`**——母版已是最小可用档，单候选没有意义。
 *
 * @param src 交付地址（= front-matter 归一后的 cover / top_img / video.poster）。
 * @example
 * srcSetOf('/images/x/x.webp')  // '/images/x/x.w480.webp 480w, /images/x/x.w800.webp 800w, /images/x/x.webp 1253w'
 */
export function srcSetOf(src: string): string | undefined {
  const img = manifest[src]
  if (!img || img.variants.length === 0) return undefined
  return [...img.variants, { src: img.src, w: img.w }].map((v) => v.src + ' ' + String(v.w) + 'w').join(', ')
}

/**
 * `sizes` 三口径（唯一真源）。按版心公式推的，不是拍的：
 *
 * 版心宽 `C = min(1700px, 100vw − 2·(6vw + clamp(20px, 4vw, 72px)))`（tokens.css 的 --page-max / --inset-x），
 * 分段化简即 `vw ≤ 500 → 88vw − 40`、`500 < vw ≤ 1800 → 80vw`、`vw > 1800 → 88vw − 144`（≥2095 起封顶 1700）。
 *
 * 三口径都取了「略大于真实格宽」的那一侧：srcset 只是候选提示，多要一档只是多几 KB，少要一档就是糊。
 */
/** 详情页顶图槽 / 观山轮播 / 视频壳：**独占整个版心**（post.css 的 .bd-hero、portfolio.css 的 .fade-carousel）。 */
export const HERO_SIZES = '(min-width: 2095px) 1700px, (min-width: 1801px) calc(88vw - 144px), (min-width: 501px) 80vw, calc(88vw - 40px)'
/** 归档网格卡（.arc-grid：1 / 2 / 3 列；≥1024 时每格 ≈ 版心/3，用 27vw）。 */
export const CARD_SIZES_3 = '(min-width: 1024px) 27vw, (min-width: 640px) 40vw, calc(88vw - 40px)'
/** 观山瀑布流卡（.portfolio：1 / 2 列；≥1024 时每格 ≈ 版心/2，用 40vw）。 */
export const CARD_SIZES_2 = '(min-width: 1024px) 40vw, calc(88vw - 40px)'
