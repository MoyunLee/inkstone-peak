// 事实集合的类型契约（posts / about 两份生成 JSON）。
// 2026-09-16 通用化 + 统一渲染层：单一文章契约——一份数据结构，kind 由构建期从 tags 里的标记判定；
// 两型都带**全套 Post Settings 有效值**（构建期已解析，运行层零默认值推理），差别只剩「作品专属字段」。

export interface TocItem {
  level: number
  id: string
  text: string
}

export interface PortfolioVideo {
  src: string | null
  poster?: string | null
  controls?: boolean
  caption?: string
}

export interface PortfolioEmbed {
  label: string
  url: string
}

export interface PostCopyright {
  author: string
  author_href: string | null
  url: string
  info: string
}

/** 两型共有的事实：卡片级字段 + 全套 Post Settings 有效值（渲染层据此做事，不再分型）。 */
export interface ArticleCommon {
  slug: string
  /** 详情页落点：work → /portfolio/<slug>｜post → /blog/<slug>。 */
  to: string
  title: string
  /** 统一排序键（ISO 日期）。 */
  date: string
  /** 展示用标签：作者手写的 tags **已由构建期剔掉类型标记**（标记词只活在 md 与构建期，不进产物）。 */
  tags: string[]
  cover: string | null
  /** 正文标题清单（构建期抽，喂详情页目录）。 */
  tocItems: TocItem[]
  bodyHtml: string

  // ── Post Settings 有效值（front-matter × site.yml 构建期合并；两型同源）──
  updated: string | null
  categories: string[]
  keywords: string | null
  description: string | null
  relatedWork: string | null
  top_img: string | null
  comments: boolean
  toc: boolean
  toc_number: boolean
  toc_style_simple: boolean
  copyright: PostCopyright | null
  mathjax: boolean
  katex: boolean
  aplayer: boolean
  highlight_shrink: boolean
  aside: boolean
  swiper_index: number | null
  top_group_index: number | null
  background: string | null
  main_color: string | null
}

/** 作品：额外的作品专属字段（其余全部继承 ArticleCommon）。 */
export interface WorkArticle extends ArticleCommon {
  kind: 'work'
  /** 项目周期（案例页 meta 条展示口径）；可选，缺省不出行。 */
  period?: string
  links?: { label: string; url: string }[]
  video?: PortfolioVideo
  embeds?: PortfolioEmbed[]
  /** 观山顶部轮播：true=上（纯图，须有 cover）。 */
  carousel: boolean
}

/** 博文：无专属字段——契约面即 ArticleCommon。 */
export interface PostArticle extends ArticleCommon {
  kind: 'post'
}

export type ArticleEntry = WorkArticle | PostArticle

