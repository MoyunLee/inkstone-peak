// 交叉校验：首页段落的组件实现清单、内部链接的路由表/锚点命中。
import { existsSync, readFileSync } from 'node:fs'
import { P } from './paths.ts'
import { issue, warn } from './diagnostics.ts'

export function sectionImplIds(): string[] {
  const file = P('src', 'site', 'sections.ts')
  if (!existsSync(file)) {
    issue('src/site/sections.ts', '（文件）', '缺失——zod③ 需要它作为"哪些段落有组件实现"的事实源（10 §5 校验③）')
    return []
  }
  const src = readFileSync(file, 'utf8')
  const ids: string[] = []
  const re = /^ {2}([A-Za-z_]\w*)\s*:\s*(?:lazy\(|[A-Z][\w$]*(?=\s*[,}]))/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    if (m[1]) ids.push(m[1])
  }
  return ids
}

/** source/site/ 下的静态交付件（带扩展名）：不属路由表，改校落盘。 */
const STATIC_ASSET_RE = /\.(pdf|zip|7z|txt|md|png|jpe?g|webp|gif|svg|ico|mp4|webm|mp3|wav|woff2?)$/i

// ── 内部链接：path 段命中路由表，碎片命中目标页锚点段 ──
export interface LinkCtx {
  homeIds: string[]
  aboutAnchors: string[]
  portfolioSlugs: string[]
  routes: string[]
  detailPrefixes: string[]
  portfolioBase: string | null
}
export function checkInternalLink(value: string, file: string, where: string, ctx: LinkCtx): void {
  if (/^(https?:|mailto:)/.test(value)) return // 外部/mailto：④ 负责格式
  let bare = value
  let frag: string | null = null
  if (bare.startsWith('#')) {
    const id = bare.slice(1)
    if (!ctx.homeIds.includes(id)) issue(file, where, `「${value}」的锚点「${id}」不在 home.sections 的 id 之列`)
    return
  }
  const hi = bare.indexOf('#')
  if (hi >= 0) {
    frag = bare.slice(hi + 1)
    bare = bare.slice(0, hi)
  }
  // 静态交付件：/resume/x.pdf 这类带扩展名的 source/site/ 文件——查落盘，不进路由白名单
  if (bare.startsWith('/') && STATIC_ASSET_RE.test(bare)) {
    const rel = bare.replace(/^\//, '')
    if (!existsSync(P('source', 'site', ...rel.split('/')))) {
      warn(`${file} › ${where}：「${value}」对应的 site/source/site/${rel} 不存在（上线即死链；把文件放进 site/source/site/ 即消失）`)
    }
    return
  }
  const dynMatch = ctx.detailPrefixes
    .map((p) => [p, bare.startsWith(p + '/') ? bare.slice(p.length + 1) : null] as const)
    .find((pair) => pair[1] !== null && /^[a-z0-9][a-z0-9-]*$/.test(pair[1]))
  const known = ctx.routes.includes(bare) || dynMatch !== undefined
  if (!known) {
    const dyn = ctx.detailPrefixes.map((p) => p + '/:slug').join(' · ')
    issue(file, where, `「${value}」的 path 段未命中路由表（白名单：${ctx.routes.join(' · ')}${dyn ? ' · ' + dyn : ''}；该表从 site.yml nav 派生——加页面请在 nav 加一行）`)
    return
  }
  if (dynMatch && dynMatch[0] === ctx.portfolioBase && dynMatch[1] && !ctx.portfolioSlugs.includes(dynMatch[1])) {
    warn(`${file} › ${where}：「${value}」指向不存在的案例 slug「${dynMatch[1]}」（发布前=死链）`)
  }
  if (frag !== null) {
    const legal = bare === '/' ? ctx.homeIds : bare === '/about' ? ctx.aboutAnchors : []
    const srcNote = bare === '/about' ? '（锚点段事实源=site.yml 的 about.anchors，10 §4.5）' : ''
    if (!legal.includes(frag)) issue(file, where, `「${value}」的碎片「#${frag}」未命中 ${bare} 页锚点段${srcNote}`)
  }
}
