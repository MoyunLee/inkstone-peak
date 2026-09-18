// Vite + React + Tailwind v4（10 §6）；纯静态无 SSR adapter（10 §7），预渲染自管（10 §3.2 pre-render.ts）
import { cpSync, createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import type { Plugin, PreviewServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VITE_VERBOSE } from './scripts/quiet.ts'

/**
 * URL 路径 → 安全的相对路径；返回 null = 非法/空（调用方自行决定放行还是 404）。
 *
 * 两道关：
 *   ① decodeURIComponent 遇畸形 %xx 会抛 URIError——不兜住就是一个 500。
 *   ② Windows 上反斜杠与 / 同为路径分隔符：只按 / 切分判 .. 时，..%5C..%5C 会整段躲过检查，
 *      再喂给 path.resolve 就变成任意文件读取（2026-09-18 实测）。故先把反斜杠归一成 / 再逐段比对。
 */
function safeRelPath(pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const backslash = String.fromCharCode(92)
  const rel = decoded.split(backslash).join('/').replace(/^[/]+/, '').replace(/[/]+$/, '')
  if (rel === '') return null
  if (rel.split('/').some((seg) => seg === '.' || seg === '..')) return null
  return rel
}

/** source/site = publicDir：Vite 会原样整份拷进 dist/，这里按后缀 + 显式文件名白名单把关（B2）。
 *  文件名白名单只收 Cloudflare 约定件；**不要**放宽成「_ 开头的都放行」——那等于给任意笔记开后门。 */
const PUBLISHABLE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico', '.pdf', '.woff', '.woff2', '.txt', '.xml', '.json'])
const PUBLISHABLE_NAMES = new Set(['_headers', '_redirects'])
function assertPublishableSource(root: string): void {
  const dir = path.resolve(root, 'source', 'site')
  if (!existsSync(dir)) return
  const bad: string[] = []
  const walk = (cur: string): void => {
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name)
      if (e.isDirectory()) walk(p)
      else if (!PUBLISHABLE_EXT.has(path.extname(e.name).toLowerCase()) && !PUBLISHABLE_NAMES.has(e.name)) bad.push(path.relative(dir, p).split(path.sep).join('/'))
    }
  }
  walk(dir)
  if (bad.length > 0) {
    throw new Error('source/site 里有非发布件（publicDir 会原样拷进 dist/）：' + bad.join('、') + '——图片放 source/images/，文档移出该目录；确需直发的扩展名加进 vite.config.ts 的 PUBLISHABLE_EXT。')
  }
}

/**
 * 让 `npm run preview` 的语义与生产一致。
 *
 * 托管商对目录路径直出 `dist/<路径>/index.html`；而 **vite preview 的 SPA 回退会把
 * 每一个非文件路径都喂成 `dist/index.html`** —— 后果是「非首页的首帧内容 = 首页」：
 * 刷新 /portfolio 先看到首页那份预渲染正文，React 挂载后才换成真页面（地址栏不变，肉眼就是「弹一下」）。
 * 这也让预渲染正文在本地完全看不出效果（21 份正文只有首页那份会被看到）。
 *
 * 故在 preview 层补一层目录索引改写：命中磁盘上的 `<路径>/index.html` 就改写到它；
 * 无扩展名的未知路径给 `/404.html`（与托管商侧「未知路径 → 404」的 fallback 语义一致；本工程不含托管专有配置）
 * （本地拿不到真 404 状态码，那是托管商层行为，与 `.shots/serve-dist.mjs` 的说明一致）。
 *
 * 只挂 preview：dev 没有预渲染、build 不产服务，产物零改动。
 */
function previewDirIndex(): Plugin {
  return {
    name: 'preview-dir-index',
    configurePreviewServer(server: PreviewServer) {
      const dist = path.resolve(server.config.root, server.config.build.outDir)
      // configurePreviewServer 的中间件先于内部静态服务执行
      server.middlewares.use((req, _res, next) => {
        const raw = req.url ?? '/'
        const cut = raw.indexOf('?')
        const pathname = cut < 0 ? raw : raw.slice(0, cut)
        const query = cut < 0 ? '' : raw.slice(cut)
        // 根、已指名的 index.html、带扩展名的静态件（/assets/x.js、/robots.txt、/favicon.svg…）一律放行
        if (pathname === '/' || pathname.endsWith('/index.html') || /\.[a-z0-9]+$/i.test(pathname)) return next()
        const rel = safeRelPath(pathname)
        if (rel === null) {
          req.url = '/404.html' + query
          return next()
        }
        req.url = (existsSync(path.join(dist, rel, 'index.html')) ? `/${rel}/index.html` : '/404.html') + query
        next()
      })
    },
  }
}

/**
 * source/ 直供与直写（2026-09-16：public/ 暂存层取消，改由「源即输入」两段拼成）。
 *
 *   `source/site/**`   → `/**`           站点根静态件（favicon / apple-touch-icon / hero-base / mist / noise；
 *                                          手工件如简历 PDF 也放这里，URL 即 /resume/x.pdf）
 *                                          —— 这一段走 **Vite 原生 publicDir**（见下方 `publicDir: 'source/site'`）：
 *                                             dev 直接供、build 直接拷进 `dist/`，且 CSS 里的 `url(/noise.webp)` 被视为公共资源不再报警。
 *   `source/images/**` → `/images/**`      ┐ URL 与源目录不同名，publicDir 表达不了，由本插件搬运
 *   `source/video/**`  → `/media/video/**`  （dev 直读源目录、支持 Range；build closeBundle 直写 dist）
 *
 * `*.md`（CREDITS / README）不是交付件，插件两处都不发。
 * SSR 那次 build 跳过搬运（不产交付目录）。
 */
function staticFromSource(): Plugin {
  const MIRRORS = [
    { from: 'images', to: 'images', url: '/images/' },
    { from: 'video', to: 'media/video', url: '/media/video/' },
  ] as const
  const MIME: Record<string, string> = {
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  }
  let root = ''
  let outDir = 'dist'
  let isSsr = false
  let isBuild = false
  return {
    name: 'static-from-source',
    configResolved(cfg) {
      root = cfg.root
      outDir = cfg.build.outDir
      isSsr = Boolean(cfg.build.ssr)
      isBuild = cfg.command === 'build'
    },
    // 发布白名单闸只挂 build：dev 时随手丢个笔记不该把人拦在门外
    buildStart() {
      if (isBuild && !isSsr) assertPublishableSource(root)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = (req.url ?? '/').split('?')[0] ?? '/'
        const pathname = (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
        const hit = MIRRORS.find((m) => pathname.startsWith(m.url))
        if (!hit) return next()
        // 反斜杠归一后再判 ..：原实现按 / 切分，Windows 上 ..%5C..%5C 会整段躲过（2026-09-18 实测漏洞）
        const guarded = safeRelPath(pathname)
        if (guarded === null || !('/' + guarded).startsWith(hit.url)) return next()
        const rel = guarded.slice(hit.url.length - 1)
        if (rel === '' || /\.md$/i.test(rel)) return next()
        const base = path.resolve(root, 'source', hit.from)
        const abs = path.resolve(base, ...rel.split('/'))
        if (abs !== base && !abs.startsWith(base + path.sep)) return next()
        if (!existsSync(abs) || !statSync(abs).isFile()) return next()
        const size = statSync(abs).size
        res.setHeader('Content-Type', MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-cache')
        const m = req.headers.range ? /bytes=(\d*)-(\d*)/.exec(req.headers.range) : null
        if (m) {
          const start = m[1] ? Number(m[1]) : 0
          const end = m[2] ? Number(m[2]) : size - 1
          if (start >= size || end >= size || start > end) {
            res.statusCode = 416
            res.setHeader('Content-Range', `bytes */${size}`)
            return res.end()
          }
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
          res.setHeader('Content-Length', String(end - start + 1))
          return createReadStream(abs, { start, end }).pipe(res)
        }
        res.setHeader('Content-Length', String(size))
        createReadStream(abs).pipe(res)
      })
    },
    // 静默搬运：成功即无声——cpSync 失败会直接抛错中止构建，不需要一行「直写 N 个文件」报平安。
    closeBundle() {
      if (isSsr) return
      for (const m of MIRRORS) {
        const from = path.resolve(root, 'source', m.from)
        if (!existsSync(from)) continue
        cpSync(from, path.resolve(root, outDir, ...m.to.split('/')), {
          recursive: true,
          filter: (src) => !/\.md$/i.test(src),
        })
      }
    },
  }
}

// build 的输出策略集中在 scripts/quiet.ts：
//   BUILD_QUIET=1 成功零输出（vite 那 ≈14 行英文进度由下面的 logLevel 压到 warn）；
//   默认出一份 hexo 风格构建报告（脚本侧负责，本文件不参与）；
//   VITE_BUILD_VERBOSE=1 还原 vite 原生英文（此时 logLevel 保持 info）。

export default defineConfig(({ command }) => ({
  // 默认 build 压到 warn（vite 的英文进度全压）——hexo 风格报告由 scripts/quiet.ts 负责，这里仍压 warn，避免两套并排。
  // VITE_BUILD_VERBOSE=1 还原 vite 原样英文；BUILD_QUIET=1 连报告一起关。
  // dev / preview 保持 info——要留启动横幅与 Local 地址。
  logLevel: command === 'build' && !VITE_VERBOSE ? 'warn' : 'info',
  // 安全默认值显式化（B1）：dev/preview 只听本机（--host 仍可按需覆盖）；生产构建不产 sourcemap。
  server: { host: '127.0.0.1', cors: false },
  preview: { host: '127.0.0.1' },
  // B9 说明：Vite 8 的转换器是 oxc（@vitejs/plugin-react 会占住 oxc 字段），`esbuild.drop` 会被静默忽略并告警，
  // 故「调试语句不进线上包」改由构建闸门保证：scripts/gate-debug.ts（挂在 npm run gate）。
  plugins: [react(), tailwindcss(), previewDirIndex(), staticFromSource()],
  // 站点根静态件住 source/site/（不在 public/）：Vite 原生 publicDir 语义 = 该目录内容映射到站点根，
  // dev 直接供、build 直接拷进 dist；/images 与 /media/video 的异名映射由 staticFromSource 负责。
  publicDir: 'source/site',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
}))
