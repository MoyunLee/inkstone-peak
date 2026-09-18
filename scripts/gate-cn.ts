// 中文闸：src/components 与 src/pages 禁中文字面量（注释之外无例外），命中即非零退出。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { info } from './quiet.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['src/components', 'src/pages']
const HAN = /[\p{sc=Han}]/u

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
for (const rel of DIRS) {
  for (const file of walk(path.join(ROOT, rel))) {
    checked += 1
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    let inBlock = false
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? ''
      const t = line.trimStart()
      // 注释豁免：整行注释与 /* */ 块内部
      if (inBlock) {
        if (line.includes('*/')) inBlock = false
        continue
      }
      if (t.startsWith('//') || t.startsWith('*')) continue
      const openIdx = line.indexOf('/*')
      let code = line
      if (openIdx >= 0) {
        const closeIdx = line.indexOf('*/', openIdx + 2)
        if (closeIdx < 0) {
          inBlock = true
          code = line.slice(0, openIdx)
        } else {
          code = line.slice(0, openIdx) + line.slice(closeIdx + 2)
        }
      }
      // 已知限度："//" 前为 ':' 视为 URL scheme；字符串内 // 后有中文会漏检
      let cut = -1
      for (let j = 1; j < code.length - 1; j++) {
        if (code[j] === '/' && code[j + 1] === '/' && code[j - 1] !== ':') {
          cut = j
          break
        }
      }
      if (cut >= 0) code = code.slice(0, cut)
      if (HAN.test(code)) {
        hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 90)}`)
      }
    }
  }
}

if (hits.length > 0) {
  console.error(`\n【中文闸拦截】组件/页面目录发现 ${hits.length} 处中文字面量（注释之外零例外，10 §3.4-6）：`)
  for (const h of hits) console.error(`  ✗ ${h}`)
  console.error('  → 界面可见中文一律住 site.yml（含 about / a11y 段）；文章内容住 source/posts/。')
  process.exit(1)
}
info('Checked ' + checked + ' files (no Chinese literals)') // 口径「注释之外零例外」写在拦截报错里，不必每趟都念
