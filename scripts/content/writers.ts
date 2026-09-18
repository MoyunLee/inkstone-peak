// 落盘：把构建产物写进 .content/（JSON，两空格缩进 + 尾换行）。当前调用方传 2 份（site / posts）：
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { OUT_DIR } from './paths.ts'

export function writeOutputs(files: { name: string; data: unknown }[]): void {
  mkdirSync(OUT_DIR, { recursive: true })
  for (const f of files) {
    writeFileSync(path.join(OUT_DIR, f.name), JSON.stringify(f.data, null, 2) + '\n', 'utf8')
  }
}
