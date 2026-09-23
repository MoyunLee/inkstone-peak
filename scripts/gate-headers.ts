// 响应头闸（gate:headers）——内容侧静态核对：vercel.json 的声明必须与内容层白名单对得上、且策略自洽。
// 为什么需要：CSP 写在托管侧（Vercel headers），而"允许嵌哪些平台"写在 scripts/content/schemas/shared.ts 的
// EMBED_HOSTS。两处分家就会出现「内容层放行了新平台、CSP 把它挡在门外」的静默失效（页面只是不出播放器）。
//
// 检查六项：
//   ① 五件套响应头齐备 ② frame-src 恰好覆盖 EMBED_HOSTS（多一个少一个都报）
//   ③ 被嵌策略**自洽**（两种模式，见下）④ script-src 不许 'unsafe-inline'
//   ⑤ object-src 'none' ⑥ 缓存声明：/assets/* 必须 immutable；/images|media/* 必须**不是** immutable
// 被嵌策略两模式（2026-09-23 用户令：为友链开放被嵌）：
//   A 锁死 = frame-ancestors 'none' + X-Frame-Options: DENY
//   B 可被嵌 = frame-ancestors *（或域名清单）且**不发** X-Frame-Options——发了就自相矛盾：
//     现代浏览器以 CSP 为准，老浏览器只认 XFO，等于白开。
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { P } from './content/paths.ts'
import { EMBED_HOSTS } from './content/schemas/shared.ts'

const REQUIRED = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy',
] as const

const fails: string[] = []
let doc: { headers?: { source: string; headers: { key: string; value: string }[] }[] }
try {
  doc = JSON.parse(readFileSync(P('vercel.json'), 'utf8'))
} catch (e) {
  console.error('✗ vercel.json 读不出来（它是托管侧响应头的唯一声明处；注意别写成带 BOM 的 UTF-8）：' + String(e))
  process.exit(1)
}
const all = (doc.headers ?? []).flatMap((r) => r.headers.map((h) => ({ source: r.source, ...h })))
const get = (key: string): string | undefined => all.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

for (const key of REQUIRED) if (!get(key)) fails.push('缺响应头 ' + key + '（声明处：vercel.json 的 headers）')
const csp = get('Content-Security-Policy') ?? ''

const frameSrc = /(?:^|;\s*)frame-src([^;]*)/.exec(csp)?.[1]
if (!frameSrc) {
  fails.push('CSP 里没有 frame-src——本站要嵌第三方播放器（B 站等），缺了它播放器会被自己挡掉')
} else {
  const allowed = new Set(frameSrc.trim().split(/\s+/).filter(Boolean))
  for (const host of EMBED_HOSTS) if (!allowed.has(host)) fails.push('CSP frame-src 少了 ' + host + '（内容层 embeds 白名单里有它）')
  for (const host of allowed) if (!EMBED_HOSTS.has(host)) fails.push('CSP frame-src 多了 ' + host + '（内容层 EMBED_HOSTS 里没有，等于给没放行的平台开口子）')
}

// ③ 被嵌策略自洽
const xfo = get('X-Frame-Options')
const ancestors = /(?:^|;\s*)frame-ancestors([^;]*)/.exec(csp)?.[1]?.trim() ?? ''
let mode = ''
if (ancestors === '') {
  fails.push("CSP 缺 frame-ancestors——被嵌策略必须显式写出来（'none' 或 * 或域名清单）")
} else if (ancestors === "'none'") {
  mode = "锁死（frame-ancestors 'none'）"
  if (xfo?.toUpperCase() !== 'DENY') fails.push("锁死模式要求 X-Frame-Options: DENY（双保险），现在是 " + (xfo ?? '没发'))
} else {
  mode = '可被嵌（frame-ancestors ' + ancestors + '）'
  if (xfo) fails.push('可被嵌模式下不许再发 X-Frame-Options（' + xfo + '）：老浏览器只认它，等于白开——删掉这一行')
}
if (/script-src[^;]*'unsafe-inline'/.test(csp)) fails.push("CSP 的 script-src 不许放 'unsafe-inline'（全站没有内联脚本，放行它等于自己拆掉 XSS 防线）")
if (!/object-src 'none'/.test(csp)) fails.push("CSP 缺 object-src 'none'")

// ⑥ 缓存
const assetsCache = all.find((h) => h.key === 'Cache-Control' && h.source === '/assets/(.*)')?.value ?? ''
if (!/immutable/.test(assetsCache)) fails.push('/assets/* 缺 immutable 缓存声明（文件名带内容哈希，可以放心一年）')
const mediaCache = all.find((h) => h.key === 'Cache-Control' && h.source === '/(images|media)/(.*)')?.value
if (!mediaCache) fails.push('缺 /images|media/* 的缓存声明')
else if (/immutable/.test(mediaCache)) fails.push('/images|media/* 不许 immutable（路径不带哈希，标了它换素材将永远不生效）——要立刻生效用 max-age=0, must-revalidate')

if (fails.length > 0) {
  console.error('✗ 响应头闸：' + fails.length + ' 项不合格')
  for (const f of fails) console.error('   ▸ ' + f)
  process.exit(1)
}
console.log(
  '✓ 响应头闸：五件套齐备 · frame-src 与 EMBED_HOSTS 一致（' + EMBED_HOSTS.size + ' 个平台）· 被嵌策略 ' + mode +
    ' · 缓存 /assets/* immutable、/images|media/* ' + mediaCache,
)
