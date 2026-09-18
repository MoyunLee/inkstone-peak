// 文章 front-matter × site.yml「Post Settings」各节默认值 → 落进 posts.json 的有效值（两型通用）。
import type { z } from 'zod'
import type { articleSchema } from './schemas/article.ts'
import type { siteSchema } from './schemas/site.ts'

/** 标题清单项（= paths.ts 的 Heading，落盘供 TOC 消费）。 */
export interface TocItem {
  level: number
  id: string
  text: string
}

type ArticleFm = z.infer<typeof articleSchema>
type Site = z.infer<typeof siteSchema>

export interface ResolvedCopyright {
  author: string
  author_href: string | null
  url: string
  info: string
}

export interface ResolvedPost {
  updated: string | null
  categories: string[]
  keywords: string | null
  description: string | null
  relatedWork: string | null
  cover: string | null
  top_img: string | null
  comments: boolean
  toc: boolean
  toc_number: boolean
  toc_style_simple: boolean
  tocItems: TocItem[]
  copyright: ResolvedCopyright | null
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

// 图片槽三态：false=关闭 / 字符串=用这张 / 缺省=回落链（top_img 回落 cover）
// 站点级 cover.enable / top_img.enable=false = 全站一票否决
function imgSlot(fm: string | false | null | undefined, fallback: string | null, globalOff: boolean): string | null {
  if (globalOff || fm === false) return null
  return typeof fm === 'string' ? fm : fallback
}

// per_page：true（缺省）=逐篇声明才加载；false=站点 enable 全站决定（math/aplayer 共用）
function perPageSwitch(fm: boolean | undefined, enable: boolean | undefined, perPage: boolean | undefined): boolean {
  if (fm !== undefined) return fm
  return perPage === false && enable === true
}

export function resolvePost(to: string, fm: ArticleFm, headings: TocItem[], site: Site): ResolvedPost {
  const cover = imgSlot(fm.cover, null, site.cover?.enable === false)
  const topImg = imgSlot(fm.top_img, cover, site.top_img?.enable === false)
  const c = site.post_copyright
  const copyrightOn = fm.copyright ?? c?.enable ?? false
  const base = site.site.url.replace(/\/+$/, '')
  return {
    updated: fm.updated ?? null,
    categories: fm.categories ?? [],
    keywords: fm.keywords ?? null,
    description: fm.description ?? null,
    relatedWork: fm.relatedWork ?? null,
    cover,
    top_img: topImg,
    comments: fm.comments ?? site.comments?.enable ?? false,
    toc: fm.toc ?? site.toc?.post ?? true,
    toc_number: fm.toc_number ?? site.toc?.number ?? true,
    toc_style_simple: fm.toc_style_simple ?? site.toc?.style_simple ?? false,
    tocItems: headings,
    copyright: copyrightOn
      ? {
          author: fm.copyright_author ?? c?.author ?? site.site.author,
          author_href: fm.copyright_author_href ?? c?.author_href ?? null,
          url: fm.copyright_url ?? c?.url ?? `${base}${to}`,
          info: fm.copyright_info ?? c?.info ?? '',
        }
      : null,
    mathjax: perPageSwitch(fm.mathjax, site.math?.mathjax?.enable, site.math?.per_page),
    katex: perPageSwitch(fm.katex, site.math?.katex?.enable, site.math?.per_page),
    aplayer: perPageSwitch(fm.aplayer, site.aplayer?.enable, site.aplayer?.per_page),
    highlight_shrink: fm.highlight_shrink ?? site.code_blocks?.shrink ?? false,
    aside: fm.aside ?? site.aside?.enable ?? false,
    swiper_index: fm.swiper_index ?? null,
    top_group_index: fm.top_group_index ?? null,
    background: fm.background ?? null,
    main_color: fm.main_color ?? null,
  }
}
