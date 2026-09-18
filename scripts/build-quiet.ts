// 以「安静模式」跑一次完整构建：`BUILD_QUIET=1 npm run build` 的跨平台等价物（Windows 下那种写法不成立）。
// 默认 `npm run build` 会打 hexo 风格报告；这个入口只服务偶尔想彻底闭嘴的场合。
import { spawn } from 'node:child_process'
import process from 'node:process'

// 走 npm 自己注入的 cli 入口（npm_execpath），不经 shell——避免 Windows 下 .cmd + shell 的 DEP0190 警告。
const npmCli = process.env.npm_execpath
const cmd = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = npmCli ? [npmCli, 'run', 'build'] : ['run', 'build']
const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, BUILD_QUIET: '1' } })
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
