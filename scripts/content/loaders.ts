// 读取与归一化：占位归一化 / 正文占位样式化 / md 目录读取 / 素材 URL 反查母版 / 周期排序键。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { P } from './paths.ts'

const IMG_PATH_KEYS = new Set(['cover', 'top_img', 'src', 'poster'])
const PLACEHOLDER_RE = /^\u3010\u5360\u4f4d\u3011/
export function normalizePlaceholders(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalizePlaceholders)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) out[k] = IMG_PATH_KEYS.has(k) && typeof val === 'string' && PLACEHOLDER_RE.test(val.trim()) ? null : normalizePlaceholders(val)
    return out
  }
  return v
}
export function markPlaceholders(html: string): string {
  return html.replace(/(\u3010占位[^\u3011]*\u3011)/g, '<span class="ph">$1</span>')
}

/** 读某目录下的 *.md（参数=相对 site/ 的路径，如 source/posts）。
 *  2026-09-16：支持子目录分组（source/posts/portfolio/x.md）——**递归**读取。
 *  子目录只作归档习惯：slug 仍取文件名（全站唯一），类型仍看 tags 里的标记，URL 不受目录影响。
 *  返回 rel = 相对该目录的路径（用于报错定位），name = 文件名去后缀（=slug）。 */
export function readMdDir(dir: string): { name: string; rel: string; raw: string }[] {
  const abs = P(...dir.split('/'))
  if (!existsSync(abs)) return []
  const out: { name: string; rel: string; raw: string }[] = []
  const walk = (cur: string): void => {
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue // 点开头一律跳过（编辑器/系统垃圾）
      const full = path.join(cur, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.md')) {
        out.push({
          name: entry.name.replace(/\.md$/, ''),
          rel: path.relative(abs, full).split(path.sep).join('/'),
          raw: readFileSync(full, 'utf8'),
        })
      }
    }
  }
  walk(abs)
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

