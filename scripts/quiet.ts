// 构建期日志（2026-09-17 第三～五轮输出治理）：
//   默认 → 仿 `hexo g` 的构建报告：横幅 · INFO Start processing · INFO Files loaded in … ·
//          逐产物 INFO Generated: … · INFO N files generated in …
//   BUILD_QUIET=1         → 成功零输出（沉默即健康）；拦截 / 内容 ⚠ / 素材提醒照旧出声。
//   VITE_BUILD_VERBOSE=1  → 让位给 vite 原生英文进度（本报告自动停，避免两套日志并排）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const QUIET: boolean = process.env.BUILD_QUIET === '1'
export const VITE_VERBOSE: boolean = !QUIET && process.env.VITE_BUILD_VERBOSE === '1'
/** 是否出 hexo 风格报告：默认开；BUILD_QUIET=1 或让位 vite 原话时关。 */
export const VERBOSE: boolean = !QUIET && !VITE_VERBOSE

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// 跨进程记账：content 步收尾写下「生成阶段起点」，feeds 步读它算总耗时（npm 链里各步是独立进程）。
const MARKER = path.join(ROOT, '.content', '.build-report')

// 颜色仿 hexo（picocolors 同款口径）：只在 TTY 里上色，管道 / 重定向时是纯文本
const tint = (code: number, s: string): string =>
  process.stdout.isTTY && !process.env.NO_COLOR ? `\u001b[${code}m${s}\u001b[0m` : s
const cyan = (s: string): string => tint(36, s)
const magenta = (s: string): string => tint(35, s)
const human = (ms: number): string => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`)

// 品牌 ASCII 横幅：仿 hexo-theme-butterfly 的 scripts/events/welcome.js（6 行 `#` 块字，字母间一个空格）。
// 字面固定 MOYUNLEE（参考项目的 BUTTERFLY 是同一字形风格）；改字只改下面这 6 行。
const BANNER = [
  '#   #  ###  #   # #   # #   # #     ##### #####',
  '## ## #   # #   # #   # ##  # #     #     #',
  '# # # #   #  # #  #   # # # # #     ####  ####',
  '#   # #   #   #   #   # #  ## #     #     #',
  '#   # #   #   #   #   # #   # #     #     #',
  '#   #  ###    #    ###  #   # ##### ##### #####',
]
/** 开张：ASCII 横幅 + `Start processing`；返回起点毫秒（给 loadedIn 计量）。 */
export function beginReport(): number {
  if (VERBOSE) {
    const bar = '='.repeat(67)
    console.log('  ' + bar)
    for (const line of BANNER) console.log('      ' + line)
    console.log('  ' + bar)
    info('Start processing')
  }
  return Date.now()
}

/** content 步装载完成：`Files loaded in …`，并写下生成阶段起点。 */
export function loadedIn(startMs: number): void {
  if (!VERBOSE) return
  info('Files loaded in ' + cyan(human(Date.now() - startMs)))
  try {
    mkdirSync(path.dirname(MARKER), { recursive: true })
    writeFileSync(MARKER, String(Date.now()), 'utf8')
  } catch {
    /* 记账失败不影响构建 */
  }
}

/** 每个产物一行：`Generated: <path>`。 */
export function generated(rel: string): void {
  if (VERBOSE) console.log('INFO  Generated: ' + magenta(rel))
}

/** 收尾总账：`N files generated in …`（起点来自 loadedIn 写下的标记）。 */
export function endReport(files: number): void {
  if (!VERBOSE) return
  let start = Date.now()
  try {
    if (existsSync(MARKER)) start = Number(readFileSync(MARKER, 'utf8')) || start
  } catch {
    /* 读不到就按「刚起步」计 */
  }
  info(files + ' files generated in ' + cyan(human(Date.now() - start)))
}

/** 信息行：`INFO  …`（默认打；BUILD_QUIET=1 或让位 vite 时关）。 */
export function info(msg: string): void {
  if (VERBOSE) console.log('INFO  ' + msg)
}
