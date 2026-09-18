// 交付件：dist/_headers（Cloudflare Pages 安全响应头 + 缓存 + 简历不索引）。
// 为什么是脚本而不是 source/site/_headers 静态件：frame-src 必须与 EMBED_HOSTS 同源，
// 静态件会与 scripts/content/schemas/shared.ts 双主漂移——加一个嵌入平台就得记得改两处。
// 故白名单在这里从 EMBED_HOSTS 派生，单一事实源。排在 vite build 之后（dist 已存在）、feeds 之前（进产物清单）。
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { EMBED_HOSTS } from './content/schemas/shared.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)

const dist = P('dist')
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ 未找到 dist/index.html——_headers 排在 vite build 之后，本脚本只注入不产壳')
  process.exit(1)
}

// 嵌入播放器白名单 → CSP frame-src（唯一事实源 = shared.ts 的 EMBED_HOSTS）
const frameSrc = [...EMBED_HOSTS].map((h) => 'https://' + h).join(' ')

// 说明几处刻意的取舍：
//   script-src 'self'   —— 预渲染产物零内联脚本（pre-render.ts 有硬闸；dist 逐份 HTML 只有一个 module 脚本），故不用 unsafe-inline。
//   style-src 分级 —— attr 必须留 unsafe-inline（SSR 有 221 处动态 style 属性：--i / --foot-rest / --post-accent…）；
//                       elem 收紧到 'self'，挡住「注入 <style> 或外链样式表」这条更危险的路径。旧浏览器回落到 style-src。
//   HSTS 不带 preload —— preload 是需主动提交、撤销以月计的承诺，个人站只保留 max-age + includeSubDomains。
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src ' + frameSrc,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const headers = [
'/*',
'  Content-Security-Policy: ' + csp,
'  X-Content-Type-Options: nosniff',
'  X-Frame-Options: DENY',
'  Referrer-Policy: strict-origin-when-cross-origin',
'  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()',
'  Strict-Transport-Security: max-age=31536000; includeSubDomains',
'',
'/assets/*',
'  Cache-Control: public, max-age=31536000, immutable',
'',
'/resume/*',
'  X-Robots-Tag: noindex, nofollow',
'',
].join('\n')

writeFileSync(path.join(dist, '_headers'), headers, 'utf8')
