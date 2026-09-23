// 响应头闸（gate:headers）——内容侧静态核对：vercel.json 的声明必须与内容层白名单对得上。
// 为什么需要：CSP 写在托管侧（Vercel headers），而"允许嵌哪些平台"写在 scripts/content/schemas/shared.ts 的
// EMBED_HOSTS。两处分家就会出现「内容层放行了新平台、CSP 把它挡在门外」的静默失效（页面只是不出播放器）。
// 检查四项：① 六件套响应头齐备 ② frame-src 恰好覆盖 EMBED_HOSTS（多一个少一个都报）
//          ③ 点击劫持双保险（frame-ancestors 'none' + X-Frame-Options DENY）④ 缓存声明仍在。
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { P } from './content/paths.ts'
import { EMBED_HOSTS } from './content/schemas/shared.ts'

const REQUIRED = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'X-Frame-Options',
  'Permissions-Policy',
  'Content-Security-Policy',
] as const

const fails: string[] = []
let doc: { headers?: { source: string; headers: { key: string; value: string }[] }[] }
try {
  doc = JSON.parse(readFileSync(P('vercel.json'), 'utf8'))
} catch (e) {
  console.error('✗ vercel.json 读不出来（它是托管侧响应头的唯一声明处）：' + String(e))
  process.exit(1)
}
const all = (doc.headers ?? []).flatMap((r) => r.headers.map((h) => ({ source: r.source, ...h })))
const get = (key: string): string | undefined => all.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

for (const key of REQUIRED) {
  if (!get(key)) fails.push('缺响应头 ' + key + '（声明处：vercel.json 的 headers）')
}
const csp = get('Content-Security-Policy') ?? ''
const frameSrc = /(?:^|;\s*)frame-src([^;]*)/.exec(csp)?.[1]
if (!frameSrc) {
  fails.push("CSP 里没有 frame-src——本站要嵌第三方播放器（B 站等），缺了它播放器会被自己挡掉")
} else {
  const allowed = new Set(frameSrc.trim().split(/\s+/).filter(Boolean))
  for (const host of EMBED_HOSTS) if (!allowed.has(host)) fails.push('CSP frame-src 少了 ' + host + '（内容层 embeds 白名单里有它）')
  for (const host of allowed) if (!EMBED_HOSTS.has(host)) fails.push('CSP frame-src 多了 ' + host + '（内容层 EMBED_HOSTS 里没有，等于给没放行的平台开口子）')
}
if (!/frame-ancestors 'none'/.test(csp)) fails.push("CSP 缺 frame-ancestors 'none'（点击劫持防护）")
if (/script-src[^;]*'unsafe-inline'/.test(csp)) fails.push("CSP 的 script-src 不许放 'unsafe-inline'（全站没有内联脚本，放行它等于自己拆掉 XSS 防线）")
if (!/object-src 'none'/.test(csp)) fails.push("CSP 缺 object-src 'none'")
if (get('X-Frame-Options')?.toUpperCase() !== 'DENY') fails.push('X-Frame-Options 必须是 DENY')
if (!all.some((h) => h.key === 'Cache-Control' && h.source === '/assets/(.*)')) fails.push('缺 /assets/* 的 immutable 缓存声明')

if (fails.length > 0) {
  console.error('✗ 响应头闸：' + fails.length + ' 项不合格')
  for (const f of fails) console.error('   ▸ ' + f)
  process.exit(1)
}
console.log('✓ 响应头闸：六件套齐备 · frame-src 与 EMBED_HOSTS 一致（' + EMBED_HOSTS.size + ' 个平台）· 点击劫持双保险在 · 缓存声明在')
