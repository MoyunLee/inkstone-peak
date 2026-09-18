// 交付件三件套：dist/sitemap.xml · dist/rss.xml · dist/robots.txt。
// 域名唯一源 = site.yml 的 site.url（旧 public/robots.txt 的静态写法会与它双主，故搬到构建期生成）。
// 排在 prerender 之后：三份都只吃 .content/ 的数据，与 HTML 无关。
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { VERBOSE, endReport, generated } from './quiet.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)

interface SiteJson {
  site: { title: string; description: string; url: string; lang: string }
  nav: { route?: string | null; isDetailPage: boolean }[]
}
interface PostJson {
  slug: string
  kind: 'post' | 'work'
  to: string
  title: string
  date: string
  updated: string | null
  description: string | null
}

const dist = P('dist')
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ 未找到 dist/index.html——feeds 排在 vite build / prerender 之后')
  process.exit(1)
}
const readJson = <T>(name: string): T => JSON.parse(readFileSync(P('.content', name), 'utf8')) as T
const site = readJson<SiteJson>('site.json')
const posts = readJson<PostJson[]>('posts.json')
const siteUrl = site.site.url.replace(/\/+$/, '')

/** XML 文本转义（标题/摘要里带 & < > " 的会毁掉整份 feed）。 */
const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// ── sitemap：固定页 + 每篇文章（作品落 /portfolio/<slug>，博文落 /blog/<slug>）──
// 页面清单与 pre-render 同一事实源：site.yml 的 nav（每个条目都有自己那份页面，详情条目另出文章页）
const STATIC_PATHS = site.nav.map((n) => ((n.route ?? '/').split('#')[0] || '/'))
const lastmod = new Map<string, string>()
for (const p of posts) {
  const d = p.updated || p.date
  if (d) lastmod.set(p.to, d)
}
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...[...STATIC_PATHS, ...posts.map((p) => p.to)].map((u) => {
    const lm = lastmod.get(u)
    const loc = `    <loc>${esc(siteUrl + u)}</loc>`
    return lm ? `  <url>\n${loc}\n    <lastmod>${esc(lm)}</lastmod>\n  </url>` : `  <url>\n${loc}\n  </url>`
  }),
  '</urlset>',
  '',
].join('\n')

// ── RSS 2.0：全站中心库口径（/blog 是中心库，作品同为其一类），按日期倒序 ──
const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
const itemDate = (d: string): string => {
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? '' : t.toUTCString()
}
const items = sorted.map((p) => {
  const link = siteUrl + p.to
  const desc = p.description || ''
  const pub = itemDate(p.date)
  return [
    '    <item>',
    `      <title>${esc(p.title)}</title>`,
    `      <link>${esc(link)}</link>`,
    `      <guid isPermaLink="true">${esc(link)}</guid>`,
    pub ? `      <pubDate>${esc(pub)}</pubDate>` : '',
    `      <description>${esc(desc)}</description>`,
    '    </item>',
  ]
    .filter((l) => l !== '')
    .join('\n')
})
const buildDate = itemDate(sorted[0]?.date ?? '') || new Date().toUTCString()
const rss = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  '  <channel>',
  `    <title>${esc(site.site.title)}</title>`,
  `    <link>${esc(siteUrl + '/')}</link>`,
  `    <description>${esc(site.site.description)}</description>`,
  `    <language>${esc(site.site.lang)}</language>`,
  `    <lastBuildDate>${esc(buildDate)}</lastBuildDate>`,
  `    <atom:link href="${esc(siteUrl + '/rss.xml')}" rel="self" type="application/rss+xml" />`,
  ...items,
  '  </channel>',
  '</rss>',
  '',
].join('\n')

// ── robots.txt：无敏感路径；404 不索引由预渲染的 noindex meta 承担，这里只补 sitemap 指路 ──
const robots = [
  'User-agent: *',
  'Allow: /',
  '',
  '# 作品集站点，无敏感路径；404 页不索引由预渲染 noindex meta 承担（见 scripts/pre-render.ts）。',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n')

writeFileSync(path.join(dist, 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(path.join(dist, 'rss.xml'), rss, 'utf8')
writeFileSync(path.join(dist, 'robots.txt'), robots, 'utf8')

// hexo 风格构建报告（默认开；BUILD_QUIET=1 关）：把 dist/ 全部产物逐条列出，最后打总账。
// 在这里一次性汇总（而非各步边写边报），口径正好等于 hexo 的 public/——产物清点即交付清单。
if (VERBOSE) {
  const rels = readdirSync(dist, { recursive: true })
    .map((p) => String(p))
    .filter((p) => statSync(path.join(dist, p)).isFile())
    .map((p) => p.split(path.sep).join('/'))
    .sort()
  for (const rel of rels) generated('dist/' + rel)
  endReport(rels.length)
}
