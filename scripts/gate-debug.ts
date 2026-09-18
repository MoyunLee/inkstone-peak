// 调试残留闸：src/ 下禁 console.* / debugger，命中即非零退出。
// 为什么是闸门而不是 build.minify 选项：Vite 8 的转换器是 oxc，esbuild.drop 已被忽略（见 vite.config.ts 说明）。
// 当前 src 为零命中，本闸把「忘了删调试语句」从自觉变成结构性保证。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { info } from './quiet.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = 'src'
const HIT = /\bconsole\s*\.|\bdebugger\b/

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

const hits: string[] = []
let checked = 0
for (const file of walk(path.join(ROOT, DIR))) {
  checked += 1
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const t = line.trimStart()
    if (t.startsWith('//') || t.startsWith('*')) continue
    if (HIT.test(line)) hits.push(path.relative(ROOT, file) + ':' + (i + 1) + ': ' + line.trim().slice(0, 90))
  }
}

if (hits.length > 0) {
  console.error('\n【调试残留闸拦截】src/ 发现 ' + hits.length + ' 处 console / debugger：')
  for (const h of hits) console.error('  ✗ ' + h)
  console.error('  → 调试语句不进生产包；确实需要保留请先确认它不输出敏感信息，并从本闸白名单说明理由。')
  process.exit(1)
}
info('Checked ' + checked + ' files (no console/debugger)')
