// 站点骨架话术的类型契约。运行时取值在 lib/data/site.ts。
import type { NavLink } from './nav'

export type { NavLink } from './nav'

export interface SiteLink {
  label: string
  to: string
}

export interface HomeSection {
  id: string
  heading?: string | null
  heading_lines?: string[]
  en?: string | null
  intro?: string | null
  cta_detail?: boolean
  cta?: SiteLink[]
}

export interface FooterColumn {
  id: string
  title?: string | null
  from?: string
  /** 键名字符串（引用 footer 下的链接表）或内联链接数组。 */
  links?: string | SiteLink[]
}

export interface BlogCfg {
  order?: 'desc' | 'asc'
  tags_max?: number
  preview_max?: number
  /** 作品在归档卡上的显示标签（界面中文的唯一家 = site.yml）。 */
  work_tag?: string
}

export interface PostMetaCfg {
  post?: {
    /** created=仅发布 / updated=仅更新（缺则回落）/ both=都出 */
    date_type?: 'created' | 'updated' | 'both'
    categories?: boolean
    tags?: boolean
    label?: boolean
  }
}

export interface HeatmapLabels {
  title: string
  less: string
  more: string
  tip: string
  tip_empty: string
  region_label: string
  years_label: string
  /** 纵轴星期序：长度 7、周日起；渲染只取 一/三/五 三行。 */
  weekdays: string[]
  /** 横轴月名：长度 12，索引 0 = 1 月。 */
  months: string[]
}

export interface SocialLink {
  platform: string
  value: string | null
  url?: string | null
  pending?: string
}

export interface AboutCfg {
  /** /about 唯一 h1 文本；必填。 */
  hero_title: string
  /** /about 声明的锚点段（可整键省）；给了须含 about + footer，作内链 /about#碎片 校验的事实源。 */
  anchors?: string[]
  /** 以下文案键全部可省：缺键即不渲染对应元素（缺省即隐藏）。 */
  tags_left?: string[]
  tags_right?: string[]
  label_intro?: string
  intro_lead?: string
  intro_sub?: string
  label_pursuit?: string
  title_pursuit_a?: string
  title_pursuit_b?: string
  label_skill?: string
  title_skill?: string
  label_career?: string
  title_career?: string
  label_stats?: string
  title_stats?: string
  label_place?: string
  title_place?: string
  place_note?: string
  place_avail?: string
  place_coord?: string
  hours_unit?: string
  /** 事实层（2026-09-16 由 content/about 并入）：生涯卡时间轴；缺省即隐藏。 */
  timeline?: { period: string; text: string }[]
  /** 事实层：游戏阅历（数据卡 2×3）；缺省即隐藏。 */
  gameLog?: { game: string; hours: number; insight?: string }[]
  /** 事实层：现居城市，填 place_note 的 {city}。 */
  location?: string
  /** 技能卡四组；唯一事实源 = site.yml about.skill_groups（缺省即隐藏）。 */
  skill_groups?: {
    id: string
    title: string
    desc: string
    tier: string
    tools: string[]
  }[]
}

/** a11y 话术键全集：必须与 scripts/content/schemas/site.ts 的 A11Y_KEYS 对齐。 */
export type A11yKey =
  | 'nav_label' | 'tabs_label' | 'seal_copy_hint' | 'brand_label'
  | 'case_period' | 'case_embeds'
  | 'detail_cta' | 'detail_aria' | 'carousel_prev' | 'carousel_next'
  | 'about_seal_label' | 'about_tags_label' | 'about_timeline_label'
  | 'post_date' | 'post_updated' | 'post_categories' | 'post_toc_label'
  | 'post_aside_label' | 'post_comments_label' | 'post_copyright_heading' | 'post_copyright_author'
  | 'post_copyright_link' | 'post_copyright_notice' | 'post_code_expand' | 'post_code_collapse'
  | 'skip_link_label'

export type A11yCfg = Partial<Record<A11yKey, string>>

export interface SiteData {
  site: {
    title: string
    author: string
    lang: string
    description: string
    tagline?: string
    /** 站点绝对 URL：预渲染 canonical 的唯一来源。 */
    url: string
  }
  nav: NavLink[]
  page_meta?: Record<string, string>
  home: { sections: HomeSection[] }
  /** 观山顶部轮播：成员由作品 front-matter 的 `carousel` 声明，这里只限最多几张（缺省/删键=不限）。 */
  portfolio?: {
    carousel?: { max_slides?: number; interval_ms?: number }
  }
  blog?: BlogCfg
  // ── Post Settings：构建期已合并 front-matter，此处仅 post_meta / comments.provider 运行时读取。
  cover?: { enable?: boolean }
  top_img?: { enable?: boolean }
  post_meta?: PostMetaCfg
  toc?: { post?: boolean; number?: boolean; style_simple?: boolean }
  post_copyright?: { enable?: boolean; author?: string | null; author_href?: string | null; url?: string | null; info?: string | null }
  comments?: { enable?: boolean; provider?: string | null }
  math?: { per_page?: boolean; mathjax?: { enable?: boolean }; katex?: { enable?: boolean } }
  aplayer?: { enable?: boolean; per_page?: boolean }
  code_blocks?: { shrink?: boolean }
  aside?: { enable?: boolean }
  heatmap?: HeatmapLabels
  about: AboutCfg
  contact: { email: string; [platform: string]: SocialLink | string }
  footer: {
    cta: { label: string; arrow?: boolean; to: string }
    columns: FooterColumn[]
    brand_bio: string
    portfolio_links: SiteLink[]
    seal_text: string
    copyright: string
    demo_note?: string
  }
  notfound: { line: string; cta: SiteLink }
  a11y: A11yCfg
}
