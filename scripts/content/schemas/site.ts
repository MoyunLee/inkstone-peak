// site.yml 结构契约（交叉规则在 build 里单独做，报错更准）。
import { z } from 'zod'
import { safeRef, socialShape, urlOrNull } from './shared.ts'

const linkShape = z.object({ label: z.string(), to: z.string() }).strict()

// a11y 话术键全集：界面可见中文的唯一家；全部可选但仍是白名单（拼错键会被构建拦下）
/** a11y 话术键白名单：必须与 src/lib/types/site.ts 的 A11yKey 对齐（改键名要两处一起改，否则组件取不到文案）。 */
const A11Y_KEYS = [
  'nav_label', 'nav_submenu_aria', 'tabs_label', 'seal_top_hint', 'brand_label',
  'case_period', 'case_embeds', 'case_nav_label', 'case_prev', 'case_next',
  'detail_cta', 'detail_aria', 'carousel_prev', 'carousel_next', 'carousel_pause', 'carousel_play',
  'about_seal_label', 'about_tags_label', 'about_timeline_label',
  'post_date', 'post_updated', 'post_categories', 'post_toc_label',
  'post_aside_label', 'post_comments_label', 'post_copyright_heading', 'post_copyright_author',
  'post_copyright_link', 'post_copyright_notice', 'post_code_expand', 'post_code_collapse',
  'related_title', 'archive_clear',
  'skip_link_label', 'lightbox_label', 'lightbox_close',
  'embed_play', 'embed_external', 'embed_failed', 'video_retry', 'video_open_native',
  'theme_label', 'theme_light', 'theme_dark', 'theme_system', 'theme_switch_hint',
] as const

/**
 * site.yml 结构契约（.strict()：拼错键当场报错，而不是静默失效）。
 *
 * 只管「形状」；跨字段规则（nav 契约、内链可达、anchors 双锚点…）在 scripts/content/build.ts 单独跑，报错更准。
 * 新增配置项时同步改 src/lib/types/site.ts。
 *
 * @example
 * const check = siteSchema.safeParse(yaml.load(readFileSync('site.yml', 'utf8')))
 */
export const siteSchema = z.object({
  site: z.object({ title: z.string(), author: z.string(), lang: z.string(), description: z.string(), tagline: z.string().optional(), url: z.string() }).strict(),
  nav: z.array(z.object({
    ink: z.string().min(1),
    route: urlOrNull,
    isDetailPage: z.boolean(),
    detailPrefix: urlOrNull,
    module: urlOrNull,
    // 顶栏分组归属：值 = 父条目的基础路由（同 navBase 口径：去 #锚、空值回落 /）；null = 顶栏一级项
    parent: urlOrNull,
  }).strict().superRefine((n, ctx) => {
    if (n.isDetailPage && (typeof n.detailPrefix !== 'string' || !n.detailPrefix.startsWith('/')))
      ctx.addIssue({ code: 'custom', path: ['detailPrefix'], message: `isDetailPage=true 的条目（「${n.ink}」）必须提供以 / 开头的 detailPrefix（可含 #锚点，2026 双导航配置契约）` })
    if (!n.isDetailPage && n.detailPrefix !== null)
      ctx.addIssue({ code: 'custom', path: ['detailPrefix'], message: `detailPrefix 仅在 isDetailPage=true 时填写（「${n.ink}」应置 null）` })
    // 自指：parent 等于自身基础路由 ⇒ 顶栏既不是一级项、也没有父面板收纳它（条目静默消失）
    if (n.parent !== null && n.parent === ((n.route ?? '/').split('#')[0] || '/'))
      ctx.addIssue({ code: 'custom', path: ['parent'], message: `parent 不能指向自身的基础路由（「${n.ink}」的 parent=${n.parent}）：那是自指，顶栏会既不当它是一级项、也没有父面板收纳它` })
  })),
  // 子页 meta 专名：键名自由（缺哪把用 site.title 回落）
  page_meta: z.record(z.string(), z.string()).optional(),
  // 子页 meta 摘要专写（键法同 page_meta；未命中回落 page-meta.ts 的 STATIC_DESC 策略小表）
  page_desc: z.record(z.string(), z.string()).optional(),
  home: z.object({ sections: z.array(
    z
      .object({
        id: z.string(),
        heading: urlOrNull.optional(),
        heading_lines: z.array(z.string()).optional(),
        en: urlOrNull.optional(),
        intro: urlOrNull.optional(),
        cta_detail: z.boolean().optional(),
        cta: z.array(linkShape).optional(),
      })
      .strict()
      .superRefine((s, ctx) => {
        const hasH = typeof s.heading === 'string' && s.heading.length > 0
        const hasLines = Array.isArray(s.heading_lines) && s.heading_lines.length > 0
        if (!hasH && !hasLines) ctx.addIssue({ code: 'custom', path: ['heading'], message: '必须提供 heading 或 heading_lines 之一' })
        if (s.heading_lines && s.heading_lines.length > 2) ctx.addIssue({ code: 'custom', path: ['heading_lines'], message: '横排断句标题最多两行（09-05 七轮终版）' })
      }),
  ).min(1) }, ).strict(),
  // Portfolio（观山顶部轮播：成员由作品 front-matter 声明，这里只限张数）
  // 作品详情页的目录默认值不在本节（portfolio.toc 已退役）：两型同走 Post Settings 的 toc.*。
  portfolio: z.object({
    carousel: z.object({ max_slides: z.number().int().positive().optional(), interval_ms: z.number().int().positive().optional() }).strict().optional(),
  }).strict().optional(),
  // Blog（归档列表与卡片）
  blog: z.object({
    order: z.enum(['desc', 'asc']).optional(),
    tags_max: z.number().int().positive().optional(),
    preview_max: z.number().int().positive().optional(),
    work_tag: z.string().min(1).optional(),
  }).strict().optional(),
  // Post Settings（逐篇 front-matter 的站点级默认值）
  cover: z.object({ enable: z.boolean().optional() }).strict().optional(),
  top_img: z.object({ enable: z.boolean().optional() }).strict().optional(),
  post_meta: z.object({
    post: z.object({
      date_type: z.enum(['created', 'updated', 'both']).optional(),
      categories: z.boolean().optional(),
      tags: z.boolean().optional(),
      label: z.boolean().optional(),
    }).strict().optional(),
  }).strict().optional(),
  toc: z.object({
    post: z.boolean().optional(),
    number: z.boolean().optional(),
    style_simple: z.boolean().optional(),
  }).strict().optional(),
  post_copyright: z.object({
    enable: z.boolean().optional(),
    author: z.string().nullable().optional(),
    author_href: safeRef('post_copyright.author_href').nullable().optional(),
    url: safeRef('post_copyright.url').nullable().optional(),
    info: z.string().nullable().optional(),
  }).strict().optional(),
  comments: z.object({ enable: z.boolean().optional(), provider: z.string().nullable().optional() }).strict().optional(),
  math: z.object({
    per_page: z.boolean().optional(),
    mathjax: z.object({ enable: z.boolean().optional() }).strict().optional(),
    katex: z.object({ enable: z.boolean().optional() }).strict().optional(),
  }).strict().optional(),
  aplayer: z.object({ enable: z.boolean().optional(), per_page: z.boolean().optional() }).strict().optional(),
  code_blocks: z.object({ shrink: z.boolean().optional() }).strict().optional(),
  aside: z.object({ enable: z.boolean().optional() }).strict().optional(),
  // Heatmap（weekdays/months 长度即刻度，写死长度防错位）
  heatmap: z.object({
    title: z.string(),
    less: z.string(),
    more: z.string(),
    tip: z.string(),
    tip_empty: z.string(),
    region_label: z.string(),
    years_label: z.string(),
    weekdays: z.array(z.string()).length(7),
    months: z.array(z.string()).length(12),
  }).strict().optional(),
  // About（/about 便当盒话术；标题/标签/卡内文案唯一家）
  // 除 hero_title（本页唯一 h1）外全部可缺省：删键即不渲染该元素（缺省即隐藏）。
  about: z.object({
    hero_title: z.string().min(1),
    tags_left: z.array(z.string()).optional(),
    tags_right: z.array(z.string()).optional(),
    label_intro: z.string().optional(),
    intro_lead: z.string().optional(),
    intro_sub: z.string().optional(),
    label_pursuit: z.string().optional(),
    title_pursuit_a: z.string().optional(),
    title_pursuit_b: z.string().optional(),
    label_skill: z.string().optional(),
    title_skill: z.string().optional(),
    label_career: z.string().optional(),
    title_career: z.string().optional(),
    label_place: z.string().optional(),
    title_place: z.string().optional(),
    place_note: z.string().optional(),
    place_avail: z.string().optional(),
    place_coord: z.string().optional(),
    //  事实层
    timeline: z.array(z.object({ period: z.string().min(1), text: z.string().min(1) }).strict()).min(1).optional(),

    location: z.string().min(1).optional(),
    // /about 声明的锚点段（整键可省）：给了就必须含 about + footer（构建期硬校验）
    anchors: z.array(z.string()).optional(),
    // 技能卡「开启创造力」等级体系（唯一事实源）：max=本档经验值上限，档位号=下标+1
    skill_levels: z
      .array(z.object({ name: z.string().min(1), max: z.number().int().positive() }).strict())
      .min(1)
      .superRefine((ls, ctx) => {
        const seen = new Set<string>()
        let prev = 0
        for (const [i, l] of ls.entries()) {
          if (seen.has(l.name)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: `等级名「${l.name}」重复（卡面按档位号取等级名，重名即两档同词）` })
          seen.add(l.name)
          if (l.max <= prev) ctx.addIssue({ code: 'custom', path: [i, 'max'], message: `max 必须严格递增（前一档 ${prev} → 本档 ${l.max}）：档位靠上界切分，等值或回退会让某档永远取不到` })
          prev = l.max
        }
      })
      .optional(),
    // 技能卡平铺技能表（唯一事实源）；level 与 exp 是否同档是跨键规则，在 build.ts 校验（需读 skill_levels）
    skills: z
      .array(z.object({
        name: z.string().min(1),
        level: z.number().int().min(1),
        exp: z.number().int().min(0),
        // 行首方章里的用途字形（lucide 名）。可选：不写或未知名都回落 circle，故不必在此立枚举硬校验。
        icon: z.string().min(1).optional(),
      }).strict())
      .min(1)
      .superRefine((ss, ctx) => {
        const seen = new Set<string>()
        for (const [i, s] of ss.entries()) {
          if (seen.has(s.name)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: `技能名「${s.name}」重复（平铺表以 name 作 React key，重名即两条同键）` })
          seen.add(s.name)
        }
      })
      .optional(),
  }).strict(),
  // Footer（联系方式 + 结构化页脚）
  contact: z.object({ email: z.string() }).catchall(socialShape()),
  footer: z.object({
    // links：内联 [{label,to}]
    columns: z.array(z.object({ id: z.string(), title: urlOrNull.optional(), from: z.string().optional(), links: z.array(linkShape).optional() }).strict()),
    brand_bio: z.string().optional(),   // 可省：栏1 只留印章时整键省（缺省即隐藏）
    email_label: z.string().optional(),  // 「联系」栏邮箱行的前缀标签（本站「邮箱」）；缺省＝裸地址
    tab_label: z.string().optional(),    // 侧栏题签里那条「直达脚页」的题签名；缺省＝该条不出现
    seal_text: z.string(),
    copyright: z.string(),
    demo_note: z.string().optional(),
  }).strict(),
  notfound: z.object({ line: z.string(), cta: linkShape }).strict(),
  a11y: z
    .object(Object.fromEntries(A11Y_KEYS.map((k) => [k, z.string()])))
    .partial()
    .strict()
    .optional(),
}).strict()
