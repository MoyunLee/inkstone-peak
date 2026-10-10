// 读取与归一化：占位归一化 / 正文占位样式化 / md 目录读取 / front-matter 切分 / 素材 URL 反查母版 / 周期排序键。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
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
 *  支持子目录分组（source/posts/portfolio/x.md）——**递归**读取。
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

/** front-matter 切分失败（围栏缺失/不合法）：调用方转成内容层报错，不往外抛栈。 */
export class FrontMatterError extends Error {}

/** 独占一行的围栏（行尾允许空白）：`---` 或 `---  `。 */
const FENCE = /^---[ \t]*$/

/** 与 gray-matter 同口径的「这段 front-matter 其实是空的」判定：整段只有注释与空白。 */
const EMPTY_MATTER = /^\s*#[^\n]+/gm

/**
 * 自己切 front-matter：第 1 行的起始围栏 → 下一个**行首独占一行**的围栏收尾，中段交给 js-yaml 解析。
 * 无围栏时 `data={}`、`content=` 原文（同 gray-matter 的 test 语义）。
 *
 * 为什么不再用 gray-matter：它整条依赖链（gray-matter@4 → js-yaml@3 → argparse → sprintf-js）
 * 只为这一个切分动作存在，npm audit 的 4 条 moderate 全出自这条链；而站点本来就用 js-yaml@4 解 site.yml。
 *
 * 与 gray-matter 的口径差异（一律**更严**，不会更松；现有 6 篇内容两种口径逐字节一致）：
 *   · 收尾围栏必须是行首独占一行的 `---`（gray-matter 认 `\n---` 前缀，`---foo` 也算收尾）；
 *   · 找不到收尾围栏**报错**（gray-matter 会把余下全文当 front-matter 静默吞掉）；
 *   · 起始行除 `---` 外还有内容（如 `---yaml` 语言标记）报错——本站内容都不用语言标记；
 *   · 开头的 BOM 先剥掉（gray-matter 不剥）；CRLF 与正文里出现 `---` 两种口径一致（只认第一个收尾围栏）。
 *
 * @param raw 文件原文（readMdDir 的 raw，未做任何归一化）
 * @example
 * splitFrontMatter('---\ntitle: 山门\n---\n正文') // → { data: { title: '山门' }, content: '正文' }
 */
export function splitFrontMatter(raw: string): { data: Record<string, unknown>; content: string } {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  if (!text.startsWith('---')) return { data: {}, content: text }

  const firstNl = text.indexOf('\n')
  const firstLine = (firstNl === -1 ? text : text.slice(0, firstNl)).replace(/\r$/, '')
  if (!FENCE.test(firstLine)) throw new FrontMatterError('front-matter 起始围栏必须独占一行（`---` 后面不能跟语言标记等内容）')
  if (firstNl === -1) throw new FrontMatterError('只有起始围栏、没有收尾围栏')

  let pos = firstNl + 1
  let closeAt = -1
  let bodyAt = -1
  while (pos <= text.length) {
    const eol = text.indexOf('\n', pos)
    const lineEnd = eol === -1 ? text.length : eol
    if (FENCE.test(text.slice(pos, lineEnd).replace(/\r$/, ''))) {
      closeAt = pos
      bodyAt = eol === -1 ? text.length : eol + 1
      break
    }
    if (eol === -1) break
    pos = eol + 1
  }
  if (closeAt === -1) throw new FrontMatterError('找不到收尾围栏（行首独占一行的 `---`）')

  const block = text.slice(firstNl + 1, closeAt)
  const parsed = block.replace(EMPTY_MATTER, '').trim() === '' ? {} : yaml.load(block)
  const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  return { data, content: text.slice(bodyAt) }
}

