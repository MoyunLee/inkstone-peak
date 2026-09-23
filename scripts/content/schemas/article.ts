// 统一文章契约（2026-09-16 通用化）：source/posts/ 单一目录，一份 schema，类型由 tags 里的标记判定。
//   tags 含 PORTFOLIO_TAG → 作品（走 /portfolio/<slug>）
//   否则                 → 博文（走 /blog/<slug>）
// 字段空间是全类型打平的：任何字段任何类型都允许（缺省即隐藏），两型都没有额外必填组。
// 2026-09-16 作品必填组退役：tldr/role/team 删除，提要复用可选 description，period 改可选。
import { z } from 'zod'
import { BILI_PAGE_HOSTS, EMBED_HOSTS, hostOf, isHttpUrl, mediaRef, safeRef } from './shared.ts'

/** 类型标记：front-matter 的 tags 含此值即作品。机器标识（非界面文案），全站唯一常量。 */
export const PORTFOLIO_TAG = 'portfolio'

// 图片槽三态：top_img / cover 共用（false=关）；值可写母版位置，经 mediaRef 归一成对外 URL
const imgSlot = z.union([mediaRef('图片路径'), z.literal(false)]).nullable().optional()

// 列表字段兼容 `tags: 写作` 与 `tags: [写作, 配置]` 两式，归一成数组
const strList = z
  .union([z.string().min(1), z.array(z.string().min(1))])
  .transform((v) => (Array.isArray(v) ? v : [v]))

const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} 必须是 ISO 形如 2026-09-06（必须加引号——裸 ISO 会被 YAML 读成日期对象）`)

/**
 * 统一文章契约：source/posts/** 下每份 .md 的 front-matter 都按它校验（.strict()，多写字段即报错）。
 *
 * 两型（作品 / 博文）共用同一份字段空间，类型由 tags 是否含 PORTFOLIO_TAG 判定；
 * 缺省即隐藏——不填的字段在渲染层一律不出。加字段时同步改 src/lib/types/content.ts 与 scripts/content/post.ts。
 *
 * @example
 * const check = articleSchema.safeParse(normalizePlaceholders(frontMatter))
 * if (!check.success) pushZod(file, [], check)
 */
export const articleSchema = z
  .object({
    // ── 全类型必填（统一事实层三件套）──
    title: z.string().min(1),
    date: isoDate('date'),
    tags: strList.refine((a) => a.length > 0, 'tags 至少一个（作品须含 ' + PORTFOLIO_TAG + '）'),
    // 发布开关：draft=true 的文章不进 posts.json（不出页面 / sitemap / rss），只在构建日志里报数
    draft: z.boolean().optional(),

    // ── 内容槽（两型通用·全可选，缺省即不渲染）──
    // A 路线·外链：任何时长，点链接跳去平台
    links: z.array(z.object({ label: z.string(), url: z.string() }).strict()).optional(),
    // B 路线·自托管视频：占顶部槽位（两型同一套壳子）
    video: z
      .object({
        src: mediaRef('video.src').nullable(),
        poster: mediaRef('video.poster').nullable().optional(),
        controls: z.boolean().optional(),
        caption: z.string().optional(),
      })
      .strict()
      .optional(),
    // C 路线·第三方播放器嵌入：仅白名单平台（博文与作品同权）
    embeds: z.array(z.object({ label: z.string(), url: z.string() }).strict()).optional(),
    // 嵌入占顶开关：true = 第一条嵌入占顶部槽（缺省 false = 嵌入全部留在正文前的「视频」分节）
    embed_hero: z.boolean().optional(),

    // ── 作品字段（全可选，缺省即不渲染）──
    // 提要复用通用 `description`（见下方）；`period` 只是案例页展示口径。
    period: z.coerce.string().optional(), // YAML 会把 `2026.09` 读成数字 → 统一转字符串
    // 观山顶部轮播（只对作品有意义；缺省不上）
    carousel: z.boolean().optional(),

    // ── 博文 / 通用字段（Butterfly Post Settings；缺省回落 site.yml）──
    updated: isoDate('updated').optional(),
    categories: strList.optional(),
    keywords: z.string().optional(),
    description: z.string().optional(),
    top_img: imgSlot,
    cover: imgSlot,
    comments: z.boolean().optional(),
    toc: z.boolean().optional(),
    toc_number: z.boolean().optional(),
    toc_style_simple: z.boolean().optional(),
    copyright: z.boolean().optional(),
    copyright_author: z.string().optional(),
    copyright_author_href: safeRef('copyright_author_href').optional(),
    copyright_url: safeRef('copyright_url').optional(),
    copyright_info: z.string().optional(),
    mathjax: z.boolean().optional(),
    katex: z.boolean().optional(),
    aplayer: z.boolean().optional(),
    highlight_shrink: z.boolean().optional(),
    aside: z.boolean().optional(),
    // background 直接进 style.background（CSS 注入面）：只放行颜色与站内相对 url()，禁 http(s) 外链与任意 CSS
    background: z
      .string()
      .regex(
        /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([0-9.,%\s/]+\)|hsla?\([0-9.,%\s/]+\)|url\(\s*['"]?\/[^'")]*['"]?\s*\))$/,
        'background 只允许 #hex / CSS 具名颜色 / rgb() / hsl() / 站内相对 url(/…)——禁 http(s) 外链与任意 CSS 片段（需要渐变请扩展本条正则）',
      )
      .optional(),
    main_color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'main_color 必须 6 位十六进制且不可缩写，如 #9e2b25（不可写 #fff）')
      .optional(),
    swiper_index: z.number().int().optional(),
    top_group_index: z.number().int().optional(),
    relatedWork: z.string().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    // 外链不留死链
    for (const [k, l] of (d.links ?? []).entries()) {
      if (!isHttpUrl(l.url)) {
        ctx.addIssue({ code: 'custom', path: ['links', k, 'url'], message: `「${l.url}」不是合法 http(s) URL（外链不留死链）` })
      }
    }
    // C 路线嵌入三闸：① 必须 https ② B 站页面地址当场教换成播放器地址
    // ③ 其余 host 必须命中白名单（注入面两段收口：内容层白名单 + 托管侧 CSP 的 frame-src，见根目录 vercel.json）
    for (const [k, e] of (d.embeds ?? []).entries()) {
      if (!/^https:\/\//.test(e.url)) {
        ctx.addIssue({ code: 'custom', path: ['embeds', k, 'url'], message: `「${e.url}」必须以 https:// 开头——http 播放器会被浏览器按"混合内容"直接拦掉` })
        continue
      }
      const host = hostOf(e.url)
      if (BILI_PAGE_HOSTS.has(host)) {
        ctx.addIssue({
          code: 'custom',
          path: ['embeds', k, 'url'],
          message: `「${e.url}」是 B 站页面地址，嵌不进 iframe；换成播放器地址：https://player.bilibili.com/player.html?bvid=BV号&autoplay=0&high_quality=1`,
        })
        continue
      }
      if (!EMBED_HOSTS.has(host)) {
        ctx.addIssue({
          code: 'custom',
          path: ['embeds', k, 'url'],
          message: `「${host || e.url}」不在嵌入白名单内（仅允许：${[...EMBED_HOSTS].join('、')}）；确需新增平台→在 scripts/content/schemas/shared.ts 的 EMBED_HOSTS 加一行`,
        })
      }
    }
  })
