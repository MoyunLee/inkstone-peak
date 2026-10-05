// 闸门共用的目录遍历：递归收集 .ts / .tsx 文件。
// 为什么单独一个文件：gate-cn 与 gate-debug 的判据不同、遍历完全相同；此前各存一份，改一处必漏另一处。
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/** 递归返回 dir 下的全部 .ts / .tsx 文件（绝对路径）；目录不存在时返回空表。 */
export function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walkTs(p))
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}
