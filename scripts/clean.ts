// 本工程的「hexo clean」对应物（hexo cl / hexo clean 会删 public/ 与 db.json）。
//   默认删三样：dist/（≈ hexo 的 public/）· .ssr/（SSR 中间件）· .content/（构建期数据）。
//   --all 再加：node_modules/.vite（dev 依赖预打包缓存）· .npm-cache/（npm 缓存）· .shots/（截图与探针产物）。
// 删完即「干净 clone」状态：npm run build 从第一步 content 重新生成一切。
// ★删了 .content/ 后不能单独跑 `npx tsc --noEmit`（它依赖 .content/*.json）——先跑 content 或直接 build。
import { existsSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ALL = process.argv.includes('--all')

const TARGETS: { rel: string; note: string }[] = [
  { rel: 'dist', note: '站点成品（hexo 的 public/）' },
  { rel: '.ssr', note: 'SSR 中间件（预渲染用）' },
  { rel: '.content', note: '构建期数据（site.json / posts.json / media-report）' },
  ...(ALL
    ? [
        { rel: path.join('node_modules', '.vite'), note: 'vite dev 依赖预打包缓存' },
        { rel: '.npm-cache', note: 'npm 缓存（.npmrc 钉在工程内）' },
        { rel: '.shots', note: '截图与探针产物' },
      ]
    : []),
]

function countFiles(dir: string): number {
  let n = 0
  for (const d of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (d.isFile()) n += 1
  }
  return n
}

console.log(ALL ? '🧹 clean --all：构建产物 + 缓存' : '🧹 clean：构建产物')
let hit = 0
for (const t of TARGETS) {
  const abs = path.join(ROOT, t.rel)
  if (!existsSync(abs)) {
    console.log('  跳过（本来就没有） ' + t.rel)
    continue
  }
  const n = countFiles(abs)
  try {
    rmSync(abs, { recursive: true, force: true })
  } catch (e) {
    console.error('✗ 删不掉 ' + t.rel + '：' + (e instanceof Error ? e.message : String(e)))
    process.exit(1)
  }
  console.log('  已删除 ' + t.rel + '（' + n + ' 个文件）— ' + t.note)
  hit += 1
}
console.log(hit > 0 ? '下一步：npm run build（会从 content 起重新生成）' : '本来就很干净，没什么可删的')
