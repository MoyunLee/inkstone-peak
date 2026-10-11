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

interface FooterColumn {
  id: string
  title?: string | null
  from?: string
  links?: SiteLink[]
}

export interface BlogCfg {
  order?: 'desc' | 'asc'
  tags_max?: number
  preview_max?: number
  /** 作品在归档卡上的显示标签（界面中文的唯一家 = site.yml）。 */
  work_tag?: string
}

interface PostMetaCfg {
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

interface AboutCfg {
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
  label_place?: string
  title_place?: string
  place_note?: string
  place_avail?: string
  place_coord?: string
  /** 事实层：生涯卡时间轴；缺省即隐藏。 */
  timeline?: { period: string; text: string }[]

  /** 事实层：现居城市，填 place_note 的 {city}。 */
  location?: string
  /** 技能等级体系；唯一事实源 = site.yml about.skill_levels（缺省即隐藏）。max=本档经验值上界，档位号=数组下标+1。 */
  skill_levels?: { name: string; max: number }[]
  /** 技能卡平铺技能表；唯一事实源 = site.yml about.skills（缺省即隐藏，数组顺序即渲染顺序）。skills[].level 与 exp 同档由构建期硬校验保证。 */
  skills?: { name: string; level: number; exp: number; icon?: string }[]
}

/** a11y 话术键全集：必须与 scripts/content/schemas/site.ts 的 A11Y_KEYS 对齐。 */
export type A11yKey =
  | 'nav_label' | 'nav_submenu_aria' | 'tabs_label' | 'seal_top_hint' | 'brand_label'
  | 'case_period' | 'case_embeds' | 'case_nav_label' | 'case_prev' | 'case_next'
  | 'detail_cta' | 'detail_aria' | 'carousel_prev' | 'carousel_next' | 'carousel_pause' | 'carousel_play'
  | 'about_seal_label' | 'about_tags_label' | 'about_timeline_label'
  | 'post_date' | 'post_updated' | 'post_categories' | 'post_toc_label'
  | 'post_aside_label' | 'post_comments_label' | 'post_copyright_heading' | 'post_copyright_author'
  | 'post_copyright_link' | 'post_copyright_notice' | 'post_code_expand' | 'post_code_collapse'
  | 'related_title' | 'archive_clear'
  | 'skip_link_label' | 'lightbox_label' | 'lightbox_close'
  | 'embed_play' | 'embed_external' | 'embed_failed' | 'video_retry' | 'video_open_native'
  | 'theme_label' | 'theme_light' | 'theme_dark' | 'theme_system' | 'theme_switch_hint'

type A11yCfg = Partial<Record<A11yKey, string>>

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
  /** 页面 meta 专名：键 = 路由 basename；另有首页专用键 `home`（首页 basename 是空串，无段名可用）。 */
  page_meta?: Record<string, string>
  /** 页面 meta 摘要专写：键法同 page_meta（首页用 `home`）；未命中回落 page-meta.ts 的 STATIC_DESC。 */
  page_desc?: Record<string, string>
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
    columns: FooterColumn[]
    /** 栏1 印章下方简介；可省（缺省即隐藏，印章居中）。 */
    brand_bio?: string
    /** 「联系」栏邮箱行的前缀标签（如「邮箱」）；可省＝裸地址。 */
    email_label?: string
    /** 侧栏题签里那条「直达脚页」的题签名（如「传音」）；可省（缺省＝该条不出现）。 */
    tab_label?: string
    seal_text: string
    copyright: string
    demo_note?: string
  }
  notfound: { line: string; cta: SiteLink }
  a11y: A11yCfg
}
