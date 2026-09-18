// CSP 静态闸：把 dist/_headers 里**实际生效的 CSP** 当契约，逐份 HTML 核对。
// 为什么需要：CSP 配错要么整页坏、要么静默失去防护，而只有真跑浏览器才暴露——本闸把能静态判定的部分自动化。
// 排在 prerender 之后（22 份 HTML 齐了）、feeds 之前。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { EMBED_HOSTS } from './content/schemas/shared.ts'
import { info } from './quiet.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)
const dist = P('dist')
const headersFile = path.join(dist, '_headers')

if (!existsSync(path.join(dist, 'index.html')) || !existsSync(headersFile)) {
  console.error('✗ dist/index.html 或 dist/_headers 缺失——本闸排在 vite build + headers + prerender 之后')
  process.exit(1)
}

const cspLine = readFileSync(headersFile, 'utf8').split(/\r?\n/).find((l) => /^\s*Content-Security-Policy:/i.test(l)) ?? ''
const csp = cspLine.replace(/^\s*Content-Security-Policy:\s*/i, '').trim()
const directives = new Map<string, string>()
for (const part of csp.split(';')) {
  const t = part.trim()
  if (t === '') continue
  const i = t.indexOf(' ')
  directives.set((i < 0 ? t : t.slice(0, i)).toLowerCase(), i < 0 ? '' : t.slice(i + 1).trim())
}

const violations: string[] = []
const scriptSrc = directives.get('script-src') ?? ''
if (scriptSrc !== "'self'") violations.push("script-src 应为 'self'，实际：" + scriptSrc)

const frameHosts = new Set<string>()
for (const m of (directives.get('frame-src') ?? '').matchAll(/https?:\/\/([^\s;]+)/g)) frameHosts.add(m[1] ?? '')
if (frameHosts.size !== EMBED_HOSTS.size || [...EMBED_HOSTS].some((h) => !frameHosts.has(h))) {
  violations.push('frame-src 与 EMBED_HOSTS 漂移：headers=' + [...frameHosts].join(',') + ' / shared=' + [...EMBED_HOSTS].join(','))
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}
const hostOf = (u: string): string => {
  try {
    return new URL(u.startsWith('//') ? 'https:' + u : u).hostname
  } catch {
    return ''
  }
}

let files = 0
let iframes = 0
for (const file of walk(dist)) {
  files += 1
  const html = readFileSync(file, 'utf8')
  const rel = path.relative(dist, file).split(path.sep).join('/')
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/gi)) violations.push(rel + ' 内联 <script>：' + m[0].slice(0, 60))
  for (const m of html.matchAll(/\son[a-z]+\s*=\s*["'\"]/gi)) violations.push(rel + ' 内联事件处理器：' + m[0].trim())
  if (/<style\b/i.test(html)) violations.push(rel + ' 含 <style> 元素（style-src-elem 只允许 self）')
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
    if (/^(https?:)?\/\//i.test(href)) violations.push(rel + ' 外链样式表：' + href)
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const src = m[1] ?? ''
    if (/^(https?:)?\/\//i.test(src)) violations.push(rel + ' 外链脚本：' + src)
  }
  for (const m of html.matchAll(/<(?:img|source|video|audio)\b[^>]*?\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi)) {
    const u = m[1] ?? ''
    if (/^(https?:)?\/\//i.test(u)) violations.push(rel + ' 站外图片/媒体（img-src/media-src 只允许 self + data:）：' + u)
  }
  for (const m of html.matchAll(/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    iframes += 1
    const u = m[1] ?? ''
    if (!/^(https?:)?\/\//i.test(u)) continue
    if (!frameHosts.has(hostOf(u))) violations.push(rel + ' iframe 源不在 frame-src 白名单：' + u)
  }
}

if (violations.length > 0) {
  console.error('\n【CSP 静态闸拦截】' + violations.length + ' 处与 dist/_headers 的 CSP 冲突：')
  for (const v of violations.slice(0, 30)) console.error('  ✗ ' + v)
  if (violations.length > 30) console.error('  … 其余 ' + (violations.length - 30) + ' 处省略')
  console.error('  → 要么改内容，要么同步 _headers（frame-src 由 EMBED_HOSTS 派生；HTML 里别写内联脚本/外链样式表）。')
  process.exit(1)
}
info('Checked ' + files + ' HTML against CSP (' + iframes + ' iframes)')
