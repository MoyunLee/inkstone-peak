// 封面多档的类型契约（.content/images.json —— 由 scripts/media.ts 构建期生成，档位口径见 scripts/srcset.ts）。
// 母版仍是唯一输入：front-matter 里 cover / top_img / video.poster 照旧只写一张路径。

/** 小档候选：由母版降采样而来。`src` 是交付地址，`w` 是出图像素宽（= srcset 的 w 描述符）。 */
export interface ImageVariant {
  src: string
  w: number
}

/** 一张母版的多档事实。 */
export interface ResponsiveImage {
  /** 母版自身的交付地址——**最大一档**（不重编码，故画质与字节都不重复）。 */
  src: string
  /** 母版原始像素宽。 */
  w: number
  /** 母版原始像素高。 */
  h: number
  /** 小档候选，按 w 升序；空数组 = 母版已是最小可用档，调用方不必写 srcSet。 */
  variants: ImageVariant[]
}

/** 清单：交付地址（/images/…）→ 多档事实。只收 source/images 下的栅格图。 */
export type ImageManifest = Record<string, ResponsiveImage>
