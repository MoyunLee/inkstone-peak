// 上线检查表：读 .content 与 public 落盘，输出 硬阻塞/已确认占位/发布开关 三档；--strict 有硬阻塞则 exit 1。
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...segs: string[]): string => path.join(ROOT, ...segs)
const readJson = <T>(name: string): T => JSON.parse(readFileSync(P('.content', name), 'utf8')) as T

interface SiteJson {
  footer: { demo_note?: string }
  contact: Record<string, unknown>
}
interface ArticleJson {
  slug: string
  kind: 'post' | 'work'
  title: string
  cover?: string | null
  video?: { src?: string | null } | null
  bodyHtml: string
}

const site = readJson<SiteJson>('site.json')
// 草稿清单（build 期产出）：只报数，不算阻塞（用户主动标了 draft: true 才跳过）
const drafts = existsSync(P('.content', 'drafts.json')) ? readJson<string[]>('drafts.json') : []
// 单一数据源：只审作品（tags 含 portfolio 的那些）
const portfolio = readJson<ArticleJson[]>('posts.json').filter((p) => p.kind === 'work')
const hasPh = (s: string | undefined): boolean => !!s && /\u3010占位|\u5f85\u8865|\u5f85\u5efa/.test(s)

const blocking: string[] = [] // 🔴 任何上线都必须修
const accepted: string[] = [] // 🟡 本期已确认保留的占位
const toggles: string[] = [] // 🟢 正式发布时手动处理

// 素材清零进度：每案两类判据（媒体齐 / 正文无占位），分母随作品数自动长
let cleared = 0
let slotsTotal = 0
for (const w of portfolio) {
  const slots: string[] = []
  if (!w.cover) slots.push('cover')
  // 自托管视频：声明了 video 但 src 未到位 → 计入待补
  if (w.video && !w.video.src) slots.push('video')
  const mediaOk = slots.length === 0
  const textOk = !hasPh(w.bodyHtml)
  slotsTotal += 2
  if (mediaOk) cleared += 1
  if (textOk) cleared += 1
  if (!mediaOk) accepted.push(`案例「${w.slug}」媒体占位：${slots.join('、')}（真实素材到位→归位 source/images/${w.slug}/ 并重跑本表）`)
  if (!textOk) accepted.push(`案例「${w.slug}」正文含【占位】措辞`)
}

// 任何「有键无 url」的社交条目都会在页脚渲染成**灰字、不可点**（有 value 时显示 value；只有 pending 才显示待建文案）——逐条列出，不写死平台名
for (const [key, raw] of Object.entries(site.contact)) {
  if (key === 'email' || raw === null || typeof raw !== 'object') continue
  const v = raw as { url?: string | null; value?: string | null }
  if (!v.url) toggles.push(`contact.${key} 无 url → 页脚灰字、不可点（${v.value ? '显示 value' : '显示 pending 待建文案'}；有真地址时补 site.yml contact.${key}.url）`)
}

// 演示站小字：正式发布时删
if (site.footer.demo_note) toggles.push('footer.demo_note 仍在——正式发布删 site.yml 该行→页脚右下小字自动消失')


// 交付件校验：只在 dist/ 已构建时跑（checklist 也允许在干净 clone 上单跑，不该因此报硬阻塞）
const dist = P('dist')
const delivery: string[] = []
if (existsSync(path.join(dist, 'index.html'))) {
  for (const f of ['sitemap.xml', 'rss.xml', 'robots.txt']) {
    if (!existsSync(path.join(dist, f))) blocking.push(`dist/${f.split(path.sep).join('/')} 未产出——build 链缺 pre-render/feeds/media 步？`)
  }
  const routes = readJson<ArticleJson[]>('posts.json')
  const works = routes.filter((p) => p.kind === 'work')
  const articles = routes.filter((p) => p.kind === 'post')
  const paths = [
    'index.html',
    path.join('portfolio', 'index.html'),
    path.join('blog', 'index.html'),
    path.join('about', 'index.html'),
    '404.html',
    ...works.map((w) => path.join('portfolio', w.slug, 'index.html')),
    ...articles.map((a) => path.join('blog', a.slug, 'index.html')),
  ]
  const missing = paths.filter((p) => !existsSync(path.join(dist, p)))
  if (missing.length > 0) blocking.push(`dist 缺 ${missing.length} 份路由 HTML（首份：${missing[0]}）`)
  else {
    const noBody = paths.filter((p) => !readFileSync(path.join(dist, p), 'utf8').includes('<div id="prerender">'))
    if (noBody.length > 0) blocking.push(`${noBody.length} 份路由 HTML 没有预渲染正文（首份：${noBody[0]}）——爬虫与无 JS 用户看到空壳`)
    else delivery.push(`${paths.length} 份路由 HTML 均含预渲染正文 · sitemap/rss/robots 三件齐`)

    // 结构化数据：每份路由恰好 1 条 JSON-LD、且是合法 JSON（404 除外——noindex 页刻意不出）。
    // 只验「有没有 / 是不是 JSON」：内容口径归 src/lib/meta/jsonld.ts 与富结果测试工具管，本表不重复一遍。
    const ldProblems: string[] = []
    let ldChecked = 0
    for (const p of paths) {
      const html = readFileSync(path.join(dist, p), 'utf8')
      const want = p === '404.html' ? 0 : 1
      const found = (html.match(/<script type="application\/ld\+json">/g) ?? []).length
      if (found !== want) {
        ldProblems.push(`${p} 的 JSON-LD 脚本 ${found} 条（应为 ${want}）——pre-render 的 <!--JSONLD--> 锚点或注入逻辑有问题`)
        continue
      }
      if (want === 0) continue
      ldChecked += 1
      const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
      try {
        const graph = JSON.parse(raw) as { '@graph'?: unknown[] }
        if (!Array.isArray(graph['@graph']) || graph['@graph'].length === 0) ldProblems.push(`${p} 的 JSON-LD 没有 @graph 节点`)
      } catch (err) {
        ldProblems.push(`${p} 的 JSON-LD 不是合法 JSON（${err instanceof Error ? err.message : String(err)}）`)
      }
    }
    if (ldProblems.length > 0) blocking.push(...ldProblems)
    else delivery.push(`${ldChecked} 份路由 HTML 各 1 条合法 JSON-LD（404 刻意不出）`)

    // 分享卡：非 404 每页四件 og 标签齐备 · og:url 必须等于 canonical · og:image 指向的图必须真在 dist 里。
    // 只验"带没带 / 对不对得上"：卡面文案口径归 src/lib/meta/page-meta.ts 的 og 字段。
    const ogProblems: string[] = []
    let ogChecked = 0
    for (const p of paths) {
      const html = readFileSync(path.join(dist, p), 'utf8')
      const want = p === '404.html' ? 0 : 4
      const found = (html.match(/<meta property="og:(?:title|description|url|image)"/g) ?? []).length
      if (found !== want) {
        ogProblems.push(`${p} 的 og 标签 ${found} 条（应为 ${want}）——pre-render 的 <!--OG--> 锚点或注入逻辑有问题`)
        continue
      }
      if (want === 0) continue
      ogChecked += 1
      const ogUrl = /<meta property="og:url" content="([^"]+)"/.exec(html)?.[1] ?? ''
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? ''
      if (ogUrl !== canonical) ogProblems.push(`${p} 的 og:url 与 canonical 不一致（${ogUrl || '空'} ≠ ${canonical || '空'}）`)
      const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? ''
      const rel = image.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '')
      if (!rel || !existsSync(path.join(dist, rel.split('/').join(path.sep)))) {
        ogProblems.push(`${p} 的 og:image 指向的文件不在 dist 里：${image || '(空)'}`)
      }
    }
    if (ogProblems.length > 0) blocking.push(...ogProblems)
    else delivery.push(`${ogChecked} 份路由 HTML 均有分享卡（og:title/description/url/image · og:url==canonical · 图在 dist 内；404 刻意不出）`)

    // 标题层级：每份路由**恰好 1 个** <h1>（含 404——它有自己的 h1）。列表页那枚是 .sr-only（只给读屏与爬虫）。
    const h1Problems: string[] = []
    for (const p of paths) {
      const n = (readFileSync(path.join(dist, p), 'utf8').match(/<h1[\s>]/g) ?? []).length
      if (n !== 1) h1Problems.push(`${p} 的 <h1> ${n} 个（应为 1）——列表页那枚是 .sr-only，见 20-设计规范 §8`)
    }
    if (h1Problems.length > 0) blocking.push(...h1Problems)
    else delivery.push(`${paths.length} 份路由 HTML 各恰好 1 个 <h1>`)
  }
} else {
  delivery.push('dist/ 未构建，跳过交付件校验（上线前 npm run build 后重跑本表）')
}

// 媒体体检：media.ts 已把编码 / faststart / 体积的结论落进 .content/media-report.json。
// 构建链只拦硬错误，质量类提醒挪到本表播报——免得每趟构建都把同一句 H.265 劝告念一遍（2026-09-17 用户令）。
const mediaNotes: string[] = []
if (existsSync(P('.content', 'media-report.json'))) {
  const report = readJson<{ warnings?: string[]; errors?: string[] }>('media-report.json')
  for (const w of report.warnings ?? []) mediaNotes.push(w)
  for (const e of report.errors ?? []) mediaNotes.push(`构建期已拦截：${e}`)
} else {
  delivery.push('媒体报告未生成（先跑 npm run build 或 npm run media，再重跑本表）')
}

// 依赖审计（B8）：.npmrc 的 audit=false 让安装期不再提醒，故上线闸门显式补跑一次。
// 离线 / 非 npm 会话一律降级为提示，不误报成硬阻塞。
const supply: string[] = []
const npmCli = process.env.npm_execpath
if (!npmCli) {
  supply.push('npm audit 跳过：非 npm 会话（改用 npm run checklist 或手动 npm audit）')
} else {
  const res = spawnSync(process.execPath, [npmCli, 'audit', '--json'], { encoding: 'utf8', timeout: 120000 })
  if (res.error || typeof res.stdout !== 'string' || res.stdout.trim() === '') {
    supply.push('npm audit 未取到结果（离线？）：' + (res.error ? res.error.message : 'no output'))
  } else {
    try {
      const j = JSON.parse(res.stdout) as { vulnerabilities?: Record<string, { severity?: string }> }
      const hi = Object.entries(j.vulnerabilities ?? {}).filter(([, x]) => x.severity === 'high' || x.severity === 'critical')
      if (hi.length === 0) supply.push('npm audit：无 high / critical')
      else {
        for (const [name, x] of hi) blocking.push(`依赖 ${name} 有 ${x.severity} 漏洞（npm audit 详见；升级后重跑本表）`)
        supply.push(`npm audit：${hi.length} 个 high/critical（已列入硬阻塞）`)
      }
    } catch {
      supply.push('npm audit 输出无法解析（npm 版本差异？）')
    }
  }
}

console.log('══════ 上线检查表（用户决定版）══════')
if (blocking.length === 0) console.log('🔴 硬阻塞：0 —— 可上线')
else {
  console.log(`🔴 硬阻塞 ${blocking.length} 项（上线前必须清零）：`)
  for (const b of blocking) console.log('   ✗ ' + b)
}
if (accepted.length > 0) {
  console.log(`🟡 本期已确认保留占位 ${accepted.length} 项（用户拍板，不阻塞本期上线；素材到位后逐项替换）：`)
  console.log(`   ▸ 素材清零进度 ${cleared}/${slotsTotal}（每案两类：媒体齐 · 正文无占位）`)
  for (const a of accepted) console.log('   · ' + a)
}
if (mediaNotes.length > 0) {
  console.log(`🟠 媒体体检 ${mediaNotes.length} 项（不阻塞构建；发布前处理好）：`)
  for (const m of mediaNotes) console.log('   · ' + m)
}
if (toggles.length > 0) {
  console.log(`🟢 正式发布开关 ${toggles.length} 项：`)
  for (const t of toggles) console.log('   · ' + t)
}
if (drafts.length > 0) {
  console.log(`🟣 草稿跳过 ${drafts.length} 篇（draft: true；不进页面 / sitemap / rss）：`)
  for (const d of drafts) console.log('   · ' + d)
}
if (supply.length > 0) {
  console.log('🟣 依赖审计：')
  for (const s of supply) console.log('   · ' + s)
}
if (delivery.length > 0) {
  console.log('🔵 交付件：')
  for (const d of delivery) console.log('   · ' + d)
}
if (process.argv.includes('--strict') && blocking.length > 0) process.exit(1)
