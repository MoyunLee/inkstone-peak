// vite build + vite build --ssr 之后：按路由清单复制壳 HTML，注入
//   ① 预渲染正文（SSR 串 → #prerender 占位块）② title/description/canonical/keywords/robots。
// 元信息口径唯一家 = src/lib/meta/page-meta.ts（运行期 RouteMeta 用同一份，SPA 换页才不会退回入口页标题）。
// 路由清单从 .content/posts.json 的 kind 派生（work → /portfolio/<slug>，post → /blog/<slug>）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pageMeta } from '../src/lib/meta/page-meta.ts'
import type { MetaArticleInput, MetaSiteInput } from '../src/lib/meta/page-meta.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)

type SiteJson = MetaSiteInput
type ArticleJson = MetaArticleInput

const dist = P('dist')
const shellFile = path.join(dist, 'index.html')
const ssrEntry = P('.ssr', 'entry-server.js')
const PRERENDER_SLOT = '<div id="prerender"></div>'

if (!existsSync(shellFile)) {
  console.error('✗ 未找到 dist/index.html——请先 `vite build`（本脚本只注入，不产壳）')
  process.exit(1)
}
if (!existsSync(ssrEntry)) {
  console.error('✗ 未找到 .ssr/entry-server.js——请先 `npm run ssr`（vite build --ssr src/entry-server.tsx）')
  process.exit(1)
}
// 壳是**重复消费**的：本脚本结尾会把根壳覆写成本页结果，故单跑 prerender 时读到的可能是上一轮的正文。
// 先把已注入的正文还原回空占位，再走一次注入（幂等）。
const shell = readFileSync(shellFile, 'utf8').replace(
  /<div id="prerender">[\s\S]*?<\/div>\n(\s*)<\/body>/,
  (_m, indent: string) => `${PRERENDER_SLOT}\n${indent}</body>`,
)
if (!shell.includes(PRERENDER_SLOT)) {
  console.error('✗ 壳里没有 `#prerender` 占位块——index.html 被改动，停下修锚（预渲染正文无处可落）')
  process.exit(1)
}
const readJson = <T>(name: string): T => JSON.parse(readFileSync(P('.content', name), 'utf8')) as T
const site = readJson<SiteJson>('site.json')
const posts = readJson<ArticleJson[]>('posts.json')
const { render } = (await import(pathToFileURL(ssrEntry).href)) as { render: (url: string) => Promise<string> }

// 页面清单从 site.yml nav 派生：静态页 = nav[].route；详情页 = nav[].detailPrefix 下的文章落点（posts[].to）。
// 本脚本不再自带路由白名单——改 detailPrefix 或加一个导航条目，页面/元信息/sitemap 自动跟上（决策 5）。
interface Page {
  dir: string
  file?: string
  urlPath: string
}
const navBase = (v: string | null | undefined): string => ((v ?? '/').split('#')[0] || '/')
const dirOf = (urlPath: string): string => urlPath.replace(/^\//, '')
const pages: Page[] = []
for (const n of site.nav) {
  // 每个 nav 条目都有它自己的页面（详情条目也有列表页：观山的 route=/portfolio、详情才是 detailPrefix）
  const base = navBase(n.route)
  pages.push({ dir: base === '/' ? '' : dirOf(base), urlPath: base })
  if (!n.isDetailPage) continue
  const prefix = navBase(n.detailPrefix ?? n.route)
  for (const pg of posts.filter((x) => x.to.startsWith(prefix + '/'))) {
    pages.push({ dir: dirOf(pg.to), urlPath: pg.to })
  }
}
pages.push({ dir: '', file: '404.html', urlPath: '/404' })

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

function inject(page: Page, body: string): string {
  const m = pageMeta(page.urlPath, site, posts)
  let html = shell.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(m.title)}</title>`)
  const setAttr = (re: RegExp, val: string, anchor: string): void => {
    if (!re.test(html)) {
      console.error(`✗ 替换锚点缺失：${anchor}（10 §3.2 要求锚点全在 index.html 固定标签——壳被改动，停下修锚）`)
      process.exit(1)
    }
    html = html.replace(re, (mt) => mt.replace(/content="[^"]*"/, () => `content="${esc(val)}"`))
  }
  // canonical 用 href 而非 content，另设一支替换器
  const setHref = (re: RegExp, val: string, anchor: string): void => {
    if (!re.test(html)) {
      console.error(`✗ 替换锚点缺失：${anchor}（10 §3.2 要求锚点全在 index.html 固定标签——壳被改动，停下修锚）`)
      process.exit(1)
    }
    html = html.replace(re, (mt) => mt.replace(/href="[^"]*"/, () => `href="${esc(val)}"`))
  }
  setAttr(/<meta name="description"[^>]*>/, m.description, 'description')
  setHref(/<link rel="canonical"[^>]*>/, m.canonical, 'canonical')
  // html lang 同属替换锚点：唯一源 = site.yml 的 site.lang（缺锚点即停下修）
  if (!/<html[^>]*lang="[^"]*"/.test(html)) {
    console.error('✗ 替换锚点缺失：html lang（index.html 的 <html lang="…"> 被改动，停下修锚）')
    process.exit(1)
  }
  html = html.replace(/<html[^>]*lang="[^"]*"/, (mt) => mt.replace(/lang="[^"]*"/, () => `lang="${esc(m.lang)}"`))
  // keywords：只在有值时插入
  if (m.keywords) {
    html = html.replace('</head>', () => `    <meta name="keywords" content="${esc(m.keywords ?? '')}" />\n  </head>`)
  }
  if (m.noindex && !/<meta name="robots"/.test(html)) {
    html = html.replace(/<\/title>/, () => '</title>\n    <meta name="robots" content="noindex" />')
  }
  // 预渲染正文必须是「已经画好、不待执行」的静态标记：React 为迟到落定的 Suspense 边界
  // 会输出 <script> 引导脚本 + <div hidden> + <template> 换装机制，那套只对 hydrate 有意义，
  // 塞进首帧反而让正文躲在 inert template 里（爬虫与肉眼都只看到骨架）。命中即停下修树。
  const late = /<script[\s>]|<template[\s>]|<div hidden/i.exec(body)
  if (late) {
    console.error(`✗ 预渲染正文含「迟到 Suspense」标记（${late[0]}）：${page.urlPath}——把该段组件改为静态注册（见 src/site/sections.ts）`)
    process.exit(1)
  }
  // 预渲染正文：替换必须是函数式，否则正文里的 $& / $1 会被当成替换模式
  html = html.replace(PRERENDER_SLOT, () => `<div id="prerender">${body}</div>`)
  return html
}

let count = 0
for (const page of pages) {
  let body = ''
  try {
    body = await render(page.urlPath)
  } catch (e) {
    console.error(`✗ 预渲染失败：${page.urlPath} — ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }
  const outDir = page.dir ? path.join(dist, page.dir) : dist
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, page.file ?? 'index.html'), inject(page, body), 'utf8')
  count += 1
}
const homePage = pages.find((x) => x.urlPath === '/') ?? { dir: '', urlPath: '/' }
writeFileSync(shellFile, inject(homePage, await render('/')), 'utf8')

// 路由数按 nav 推导：每个 nav 条目一份页面 + 每篇文章一份详情页 + 404
const expect = site.nav.length + posts.length + 1
if (count !== expect) {
  console.error(`✗ 预渲染路由数 ${count} ≠ nav 推出的 ${expect}（nav 条目×${site.nav.length} + 文章×${posts.length} + 404）——路由表与清单脱节，停下报告`)
  process.exit(1)
}
