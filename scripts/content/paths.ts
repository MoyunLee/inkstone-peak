// 构建期根路径与共享 markdown 渲染器；所有内容脚本从这里取 ROOT / P()。
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const P = (...segs: string[]): string => path.join(ROOT, ...segs)
export const OUT_DIR = P('.content')
// ⚠ 安全不变量：html 必须保持 false。
//   正文经 PostBody 的 dangerouslySetInnerHTML 直出（React 不做转义），html:true 等于把 markdown 里的原始 HTML 原样执行。
//   linkify:false 同时避免裸 URL 被自动变成链接。要支持自定义 HTML，必须同时上 DOMPurify，不能只改这一个开关。
export const RENDER = new MarkdownIt({ html: false, linkify: false, typographer: false })

/** 标题清单项（TOC 事实层，组件零解析）。 */
export interface Heading {
  level: number
  id: string
  text: string
}

// 标题锚点：h1..h6 生成稳定 id，清单塞进 env.headings
function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}

RENDER.core.ruler.push('heading_anchor', (state) => {
  const env = state.env as { headings?: Heading[] }
  const used = new Set<string>()
  for (let i = 0; i < state.tokens.length; i += 1) {
    const open = state.tokens[i]
    if (!open || open.type !== 'heading_open') continue
    const inline = state.tokens[i + 1]
    const text = inline && inline.type === 'inline' ? inline.content.replace(/`([^`]*)`/g, '$1').trim() : ''
    let id = slugify(text)
    while (used.has(id)) id += '-1'
    used.add(id)
    open.attrSet('id', id)
    env.headings?.push({ level: Number(open.tag.slice(1)), id, text })
  }
  return true
})

/** 渲染正文并回带标题清单（博客详情 TOC 的唯一事实源）。 */
export function renderBody(src: string): { html: string; headings: Heading[] } {
  const env: { headings: Heading[] } = { headings: [] }
  const html = RENDER.render(src, env)
  return { html, headings: env.headings }
}

// ── source/ 素材：磁盘母版位置 ↔ 对外交付 URL 的单一映射 ──
// 与 vite.config.ts 的 staticFromSource.MIRRORS 同构（source/images/** → /images/**；source/video/** → /media/video/**）。
// front-matter 的图片/视频槽一律先经 toMediaUrl 归一成 URL 再落 posts.json，故页面层只见对外地址。
export const MEDIA_MIRRORS: readonly (readonly [from: string, url: string])[] = [
  ['images', '/images/'],
  ['video', '/media/video/'],
]

/** 对外 URL → source/ 母版绝对路径；非站内素材路径（或含 ..）返回 null。 */
export function masterPathFor(url: string): string | null {
  if (!url.startsWith('/') || url.includes('..')) return null
  const u = url.replace(/^\/+/, '')
  for (const [from, prefix] of MEDIA_MIRRORS) {
    const p = prefix.slice(1)
    if (u.startsWith(p) && u.length > p.length) return P('source', from, ...u.slice(p.length).split('/'))
  }
  return null
}

/** 作者书写 → 对外 URL：认站内地址，也认 source/ 下的母版位置——
 *  source/images/<slug>/x.webp、images/<slug>/x.webp、绝对路径（如 D:/my-site/source/video/x.mp4）、反斜杠皆可。
 *  返回 null = 不是素材路径，交回 safeRef 判 http(s) / 站内地址。 */
export function toMediaUrl(input: string): string | null {
  const raw = input.trim().replace(/\\/g, '/')
  if (raw === '' || /^https?:\/\//i.test(raw) || raw.split('/').includes('..')) return null
  if (raw.startsWith('/')) {
    const u = raw.replace(/^\/media\/images\//, '/images/') // 旧别名（从未被交付）归一到真地址
    return masterPathFor(u) ? u : null
  }
  // 磁盘位置：取 source/ 段之后的相对路径（兼容绝对路径与裸 source/…；避开 my-source/ 这类同名干扰）
  const at = raw.lastIndexOf('source/')
  const rel = at === 0 || (at > 0 && raw[at - 1] === '/') ? raw.slice(at + 'source/'.length) : raw
  if (rel.startsWith('media/')) {
    const u = ('/' + rel).replace(/^\/media\/images\//, '/images/')
    return masterPathFor(u) ? u : null
  }
  for (const [from, url] of MEDIA_MIRRORS) {
    if (rel.startsWith(from + '/') && rel.length > from.length + 1) return url + rel.slice(from.length + 1)
  }
  return null
}
