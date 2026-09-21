// 内容管线主流程（2026-09-16 通用化）：单一 source/posts/ 目录 + 一份文章契约。
// 类型由 front-matter 的 tags 判定（含 PORTFOLIO_TAG=作品 / 否则=博文）——判定**只在构建期这一处**；
// 标记词随后从产物的 tags 里剔除（运行层只看 kind、不认识那个词），产出单份 .content/posts.json。
// 读事实 → zod 三集合校验 → 交叉规则 → 写盘；runOnce 负责报错与退出码。
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import type { z } from 'zod'
import { masterPathFor, P, renderBody, ROOT } from './paths.ts'
import type { Heading } from './paths.ts'
import { ContentError, errors, issue, pushZod, warn, warnings } from './diagnostics.ts'
import { isHttpUrl } from './schemas/shared.ts'
import { articleSchema, PORTFOLIO_TAG } from './schemas/article.ts'
import { siteSchema } from './schemas/site.ts'
import { beginReport, info, loadedIn } from '../quiet.ts'
import { sectionImplIds, checkInternalLink } from './checks.ts'
import type { LinkCtx } from './checks.ts'
import { markPlaceholders, normalizePlaceholders, readMdDir } from './loaders.ts'
import { resolvePost } from './post.ts'
import { writeOutputs } from './writers.ts'

/** 标题自带编号的常见写法：中文序数（一、）与十进制小节号（3.1 / 1.）。只服务下面「双份编号」守卫。 */
const SELF_NUMBERED = /^(?:[一二三四五六七八九十]{1,3}、|[0-9]+(?:[.][0-9]+)+[ 　]|[0-9]+[.、][ 　])/

export function build(report = true): boolean {
  errors.length = 0
  warnings.length = 0

  // ── 统一文章集合：单一 source/posts/ 目录，一份契约 ──
  //    类型不再靠目录或布尔标记，改由 tags 判定：含 PORTFOLIO_TAG=作品（/portfolio/<slug>），否则=博文（/blog/<slug>）。
  const SOURCES = readMdDir('source/posts')
  const entries: { slug: string; data: z.infer<typeof articleSchema>; bodyHtml: string; headings: Heading[] }[] = []
  const fileOf = new Map<string, string>()
  const seenSlug = new Map<string, string>()
  const drafts: string[] = []

  for (const f of SOURCES) {
    const file = `source/posts/${f.rel}`
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.name)) {
      issue(file, 'slug', '文件名必须 kebab-case（slug=文件名=URL 段）')
    }
    const dup = seenSlug.get(f.name)
    if (dup) issue(file, 'slug', `slug「${f.name}」与 ${dup} 重名（slug 全站唯一，决定 URL 段）`)
    else seenSlug.set(f.name, file)
    fileOf.set(f.name, file)

    const parsed = matter(f.raw)
    const fm = { ...((parsed.data ?? {}) as Record<string, unknown>) }

    const check = articleSchema.safeParse(normalizePlaceholders(fm))
    if (!check.success) {
      pushZod(file, [], check)
      continue
    }
    const d = check.data
    // 草稿：不进 entries → 不出页面 / 预渲染 / sitemap / rss（只在这里报数）
    if (d.draft === true) {
      drafts.push(file)
      continue
    }
    const isWork = d.tags.includes(PORTFOLIO_TAG)
    if (isWork && d.carousel === true && !d.cover) {
      warn(`${file} › carousel：声明上轮播但没有 cover（轮播是纯图，没图进不去；补上 cover 即自动出现）`)
    }
    // 正文与两套详情页同一条渲染路径：占位样式化 + 回带标题清单喂右侧目录
    const built = renderBody(parsed.content)
    entries.push({ slug: f.name, data: d, bodyHtml: markPlaceholders(built.html), headings: built.headings })
  }

  // 统一排序：date 倒序，平手按 slug 升序（归档列表与观山列表共用的顺序基数）
  entries.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.slug.localeCompare(b.slug))

  const works = entries.filter((e) => e.data.tags.includes(PORTFOLIO_TAG))
  const portfolioSlugs = works.map((w) => w.slug)
  if (works.length === 0) issue('source/posts/', '（目录）', `没有任何作品（tags 含 ${PORTFOLIO_TAG}）——首页观山段与 /portfolio 列表都将为空`)

  // 素材存在性（警告不阻断，与 site.yml footer.cv 的存在性校验同构）：一律校 source/ 母版而非镜像产物
  for (const e of entries) {
    const d = e.data
    const slots: [string, string | null | undefined][] = [
      ['cover', typeof d.cover === 'string' ? d.cover : null],
      ['top_img', typeof d.top_img === 'string' ? d.top_img : null],
      ['video.src', d.video?.src],
      ['video.poster', d.video?.poster],
    ]
    for (const [field, url] of slots) {
      if (typeof url !== 'string' || url.startsWith('http')) continue
      const mp = masterPathFor(url)
      if (mp === null) {
        warn(`${fileOf.get(e.slug) ?? e.slug} › ${field}：「${url}」不是已知素材路径（写母版位置 source/images/<slug>/x.webp 或 source/video/x.mp4，也可写站内地址 /images/<slug>/x.webp 或 /media/video/x.mp4）——母版无从校验`)
      } else if (!existsSync(mp)) {
        warn(`${fileOf.get(e.slug) ?? e.slug} › ${field}：「${url}」的母版 ${path.relative(ROOT, mp).split(path.sep).join('/')} 不存在（页面退化为占位槽；素材到位即消失）`)
      }
    }
    // 关联作品互链：只对博文有意义（悬空仅提醒）
    if (!d.tags.includes(PORTFOLIO_TAG) && d.relatedWork && !portfolioSlugs.includes(d.relatedWork)) {
      warn(`${fileOf.get(e.slug) ?? e.slug} › relatedWork：「${d.relatedWork}」不是已有作品 slug（互链悬空，仅提醒）`)
    }
  }

  const siteRaw = (() => {
    const file = P('site.yml')
    if (!existsSync(file)) {
      issue('site.yml', '（文件）', '缺失——骨架与话术的唯一来源')
      return null
    }
    try {
      return yaml.load(readFileSync(file, 'utf8'))
    } catch (e) {
      issue('site.yml', '（解析）', `YAML 语法错误：${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  })()
  let siteData: z.infer<typeof siteSchema> | null = null
  if (siteRaw !== null && siteRaw !== undefined) {
    const check = siteSchema.safeParse(siteRaw)
    if (check.success) siteData = check.data
    else pushZod('site.yml', [], check)
  }
  const t0 = report ? beginReport() : 0

  if (siteData) {
    const s = siteData
    const homeIds = s.home.sections.map((x) => x.id)
    const navBase = (v: string | null): string => ((v ?? '/').split('#')[0] || '/')
    const routes = [...new Set(s.nav.map((n) => navBase(n.route)))]
    const detailPrefixes = [...new Set(s.nav.filter((n) => typeof n.detailPrefix === 'string').map((n) => navBase(n.detailPrefix)))]
    const portfolioBase = navBase(s.nav.find((n) => n.module === 'portfolio')?.route ?? '/portfolio')
    const linkCtx: LinkCtx = { homeIds, aboutAnchors: s.about.anchors ?? [], portfolioSlugs, routes, detailPrefixes, portfolioBase }

    // nav 契约：module ∈ home.sections[].id 且全站唯一；ink / route 基路径全站唯一；detailPrefix 不得撞车
    const seenModule = new Set<string>()
    const seenInk = new Set<string>()
    const seenRoute = new Set<string>()
    const seenPin = new Set<string>()
    for (const [i, n] of s.nav.entries()) {
      if (seenInk.has(n.ink)) issue('site.yml', `nav.${i}.ink`, `显示名「${n.ink}」重复（React key 与"同 id 同词"律要求全站唯一）`)
      seenInk.add(n.ink)
      const rbase = ((n.route ?? '/').split('#')[0] || '/')
      if (seenRoute.has(rbase)) issue('site.yml', `nav.${i}.route`, `基路径「${rbase}」已被另一条 nav 占用（route 与页面一一对应，2026 锚点改制教义；悟录类封存行恢复须另择路径）`)
      seenRoute.add(rbase)
      if (typeof n.detailPrefix === 'string') {
        const pbase = (n.detailPrefix.split('#')[0] || '/')
        if (seenPin.has(pbase)) issue('site.yml', `nav.${i}.detailPrefix`, `激活前缀「${pbase}」与另一条 nav 撞车（前缀匹配将先后遮蔽，语义歧义）`)
        seenPin.add(pbase)
      }
      if (n.module !== null) {
        if (!homeIds.includes(n.module)) {
          issue('site.yml', `nav.${i}.module`, `「${n.module}」不在 home.sections 的 id 之列（校验①，滚动联动/锚点落点事实源）`)
        }
        if (seenModule.has(n.module)) issue('site.yml', `nav.${i}.module`, `段锚点「${n.module}」被两条 nav 占用（module 全站唯一，nav-sync resolve ① 依赖）`)
        seenModule.add(n.module)
      }
    }
    // 锚点段事实源（2026-09-16 由 content/about 并入；整键可省）：给了就必须含 about + footer 双锚点
    for (const need of ['about', 'footer']) {
      if (s.about.anchors && !s.about.anchors.includes(need)) issue('site.yml', 'about.anchors', `声明了 anchors 就必须同时含 about 与 footer 双锚点（构建期硬校验），缺「${need}」`)
    }
    const impl = sectionImplIds()
    for (const [i, sec] of s.home.sections.entries()) {
      if (!impl.includes(sec.id)) issue('site.yml', `home.sections.${i}.id`, `「${sec.id}」在 src/site/sections.ts 无组件实现（幽灵项=构建失败，校验③）`)
    }
    for (const extra of impl) {
      if (!homeIds.includes(extra)) warn(`sections.ts 注册了 yml 里没有的段「${extra}」（渲染不到，仅提醒）`)
    }
    const seenId = new Set<string>()
    for (const sec of s.home.sections) {
      if (seenId.has(sec.id)) issue('site.yml', 'home.sections', `段 id「${sec.id}」重复`)
      seenId.add(sec.id)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contact.email)) issue('site.yml', 'contact.email', `「${s.contact.email}」不是合法邮箱（校验④）`)
    if (!isHttpUrl(s.site.url)) issue('site.yml', 'site.url', `「${s.site.url}」必须是合法的绝对 http(s) URL（预渲染逐路由 canonical 唯一来源）`)
    for (const [key, link] of Object.entries(s.contact)) {
      if (key === 'email') continue
      const u = (link as { url?: string | null }).url
      if (u !== null && u !== undefined && !isHttpUrl(u)) issue('site.yml', `contact.${key}.url`, `「${u}」既不是 null 也不是合法 URL（校验④：null→不渲染链接、不留死链）`)
    }
    for (const [i, n] of s.nav.entries()) {
      if (typeof n.route === 'string') checkInternalLink(n.route, 'site.yml', `nav.${i}（${n.ink}）.route`, linkCtx)
      if (typeof n.detailPrefix === 'string') checkInternalLink(n.detailPrefix, 'site.yml', `nav.${i}（${n.ink}）.detailPrefix`, linkCtx)
    }
    for (const [i, sec] of s.home.sections.entries()) {
      for (const [j, c] of (sec.cta ?? []).entries()) checkInternalLink(c.to, 'site.yml', `home.sections.${i}（${sec.id}）.cta.${j}.to`, linkCtx)
    }
    checkInternalLink(s.footer.cta.to, 'site.yml', 'footer.cta.to', linkCtx)
    for (const [k, l] of s.footer.portfolio_links.entries()) checkInternalLink(l.to, 'site.yml', `footer.portfolio_links.${k}.to`, linkCtx)
    checkInternalLink(s.notfound.cta.to, 'site.yml', 'notfound.cta.to', linkCtx)
    for (const [i, col] of s.footer.columns.entries()) {
      if (col.id === 'brand') continue
      if (!col.from && !col.links) {
        issue('site.yml', `footer.columns.${i}`, '非 brand 栏必须给 from（nav/contact）或 links（footer 链接表键名 / 内联 [{label,to}]）之一')
        continue
      }
      if (typeof col.links === 'string' && !(col.links in s.footer)) {
        issue('site.yml', `footer.columns.${i}.links`, `「${col.links}」不是 footer 下的链接表键名`)
      }
      if (Array.isArray(col.links)) {
        for (const [j, l] of col.links.entries()) checkInternalLink(l.to, 'site.yml', `footer.columns.${i}.links.${j}.to`, linkCtx)
      }
    }
    // 轮播张数上限：候选多于上限 → 只呈现前 N（提醒，不阻断）
    const maxSlides = s.portfolio?.carousel?.max_slides
    const slidePool = works.filter((w) => w.data.carousel === true && !!w.data.cover).length
    if (maxSlides && slidePool > maxSlides) {
      warn(`轮播候选 ${slidePool} 张 > site.yml portfolio.carousel.max_slides=${maxSlides}，只呈现前 ${maxSlides}（作品 date 倒序）`)
    }
  }

  if (errors.length > 0) {
    const lines = errors.map((e) => `✗ ${e.file} › ${e.where}：${e.why}`)
    throw new ContentError(lines)
  }
  if (siteData === null) {
    throw new ContentError(['✗ site.yml 仍有未通过校验的内容，详见上方报错'])
  }

  // front-matter × site.yml Post Settings → 有效值钉进 posts.json（运行层零默认值推理）
  // 统一渲染层（2026-09-16）：**两型都算全套 Post Settings**（aside / toc / 版权 / 代码框 / 主色…），
  // 渲染层因此不再分型做默认值推理——作品与博文的差别只剩「作品专属字段」。
  // 目录默认值不分家（2026-09-21 统一壳子）：两型同走 site.yml toc.*，逐篇 front-matter 仍可覆盖。
  const items = entries.map((e) => {
    const d = e.data
    const isWork = d.tags.includes(PORTFOLIO_TAG)
    // 详情 URL 的基路径从 nav 的 detailPrefix 取（改 site.yml 前缀 → 文章落点自动跟着走）；缺项回退沿用旧值
    const detailBase = (mod: string, fallback: string): string => {
      const n = siteData?.nav.find((x) => x.isDetailPage && x.module === mod)
      return ((n?.detailPrefix ?? n?.route ?? fallback).split('#')[0] || fallback).replace(/\/+$/, '')
    }
    const to = isWork ? `${detailBase('portfolio', '/portfolio')}/${e.slug}` : `${detailBase('blog', '/blog')}/${e.slug}`
    const settings = resolvePost(to, d, e.headings, siteData)
    // 双份编号守卫：标题自带编号（「一、」「3.1 」）× 自动编号 = 目录与正文各出两套数字。
    // 实测案例：2026-09-17 site-yml-guide（## 一、… + ### 3.1 …，而 toc.number 默认开）。
    if (settings.toc_number) {
      const dup = e.headings.find((h) => SELF_NUMBERED.test(h.text))
      if (dup) {
        const where = fileOf.get(e.slug) ?? e.slug
        warn(
          where +
            ' › 标题「' + dup.text + '」自带编号，而自动编号（toc_number）生效——目录与正文会各出两套数字；' +
            '改 front-matter 的 toc_number 为 false，或删掉标题里手写的编号',
        )
      }
    }
    const base = {
      slug: e.slug,
      kind: isWork ? ('work' as const) : ('post' as const),
      to,
      title: d.title,
      date: d.date,
      // 类型标记是**分流指令**，不进产物：md 里照写 tags: [portfolio]，落 posts.json 前剔掉——
      // 运行层因此完全不需要知道那个词（身份看 kind、展示看这枚 tags），配置与常量的双源从根上消失。
      tags: d.tags.filter((t) => t !== PORTFOLIO_TAG),
      bodyHtml: e.bodyHtml,
      ...settings, // 含 resolvePost 回带的 tocItems
    }
    if (!isWork) return base
    // 作品：卡片级封面（归档卡与列表卡口径）+ 作品专属字段
    // 提要口径：tldr / excerpt 均已退役，观山卡与案例页首行直接读可选的 description（缺省即不出）。
    return {
      ...base,
      cover: typeof d.cover === 'string' ? d.cover : null,
      period: d.period,
      links: d.links,
      video: d.video,
      embeds: d.embeds,
      carousel: d.carousel === true,
    }
  })

  writeOutputs([
    { name: 'site.json', data: siteData },
    { name: 'posts.json', data: items },
    { name: 'drafts.json', data: drafts },
  ])

  if (report) loadedIn(t0)
  if (drafts.length > 0) info('Skipped ' + drafts.length + ' drafts: ' + drafts.join(', '))
  for (const w of warnings) console.log(`⚠ ${w}`)
  return true
}

export function runOnce(watchMode: boolean): boolean {
  try {
    build(!watchMode)
    return true
  } catch (e) {
    const lines = e instanceof ContentError ? e.lines : [`✗ 未预期错误：${e instanceof Error ? (e.stack ?? e.message) : String(e)}`]
    console.error(`\n【内容校验失败 · 构建中止】（${errors.length > 0 ? errors.length : '?'} 处）`)
    for (const l of lines) console.error(l)
    if (!watchMode) process.exit(1)
    console.error('（watch 模式：修好即自动重跑）')
    return false
  }
}
