// 构建期契约对账：把 .content/*.json 赋给运行层 interface（零运行时行为，无需被 import；tsc --noEmit 覆盖 scripts/）。
import postsJson from '../../.content/posts.json'
import siteJson from '../../.content/site.json'
import type { ArticleEntry } from '../../src/lib/types/content.ts'
import type { SiteData } from '../../src/lib/types/site.ts'

/** 放宽 JSON 导入的字面量拓宽（'desc' → string）；字段有无 / 基类型 / 可空性仍完整校验。 */
type JsonView<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends null
        ? null
        : T extends undefined
          ? undefined
          : T extends readonly (infer U)[]
            ? JsonView<U>[]
            : T extends object
              ? { [K in keyof T]: JsonView<T[K]> }
              : T

export const postsContract: JsonView<ArticleEntry[]> = postsJson
export const siteContract: JsonView<SiteData> = siteJson
