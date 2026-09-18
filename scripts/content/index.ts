// 入口：--watch 走常驻监听，否则跑一次（失败即非零退出）。
import process from 'node:process'
import { runOnce } from './build.ts'
import { startWatch } from './watch.ts'

const WATCH = process.argv.includes('--watch')
runOnce(WATCH)
if (WATCH) startWatch()
