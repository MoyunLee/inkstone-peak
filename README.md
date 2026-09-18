# 砚山 · 个人作品集站

> 英文名 **INKSTONE PEAK** ｜ 作者：杜康 ｜ 仓库名 `inkstone-peak`

一个纯静态的个人作品集 + 博客站点。长滚动首页、作品案例页、博客归档与详情、关于页、独立传音页与 404，
全部在构建期完成内容校验、SEO 与正文预渲染，产物 `dist/` 可直接交给任意静态托管。

- 运行层：React 19 · react-router 7 · TypeScript 5
- 构建：Vite 8（纯静态，无 SSR adapter）· Tailwind CSS v4
- 内容层：`gray-matter` + `yaml` + `zod` v4 + `markdown-it`（构建期校验并落成品 JSON）
- 生成期素材：`sharp`（底图 / 云雾 / 噪点 / favicon）

## 快速开始

要求 Node ≥ 23.6（`.nvmrc` 钉 24）。

```bash
npm ci
npm run dev        # 开发服务器 http://127.0.0.1:5173
npm run build      # 完整构建 → dist/
npm run preview    # 本地预览 dist/，语义与生产一致 http://127.0.0.1:4173
npm run checklist  # 上线检查表
```

Windows 下也可以直接双击仓库根目录的 `打开本地站.bat`（首次会自动构建再起预览）。

## 目录结构

```
site.yml             站点配置：导航、首页分段、页脚、about 事实层、逐篇默认值（界面中文的唯一家）
source/              作者唯一入口（母版）
  posts/<type>/<slug>.md   文章；tags 含 portfolio → 作品，否则博文
  images/<slug>/…          图片母版 → /images/<slug>/…
  video/…                  视频母版 → /media/video/…
  site/…                   站点根静态件（favicon、底图、简历 PDF…）→ /
scripts/             构建期管线：content / media / assets / gate / ssr / prerender / headers / feeds
src/                 运行层：页面、组件、样式（只读 .content/*.json 成品，不做默认值推理）
dist/ .content/      构建产物（已 gitignore）
```

## 写内容

新建文章 = 在 `source/posts/` 下放一个 `<slug>.md`（kebab-case 且全站唯一，slug 即 URL 段）：

```markdown
---
title: 标题
date: "2026-09-16"      # 必须加引号，裸 ISO 会被 YAML 读成日期对象
tags: [写作]
---

正文…
```

- **作品 vs 博文只看标签**：`tags` 含 `portfolio` → 作品（`/portfolio/<slug>`，可用 `period` / `links` / `video` / `embeds` / `carousel` 等作品字段）；
  不含 → 博文（`/blog/<slug>`）。两者共用一套 Post Settings 默认值，写在 `site.yml`。
- **图片 / 视频直接写母版位置**：`cover: source/images/<slug>/cover.webp` 与 `cover: /images/<slug>/cover.webp` 等价，
  构建期统一归一成交付地址；视频 `source/video/x.mp4` ↔ `/media/video/x.mp4`。
- 改文案 / 导航 / 页脚 / 关于页 → 只改 `site.yml`。
- 字段速查：站点内的《本站 front-matter 全字段速查》；素材规范见 `source/images/README.md`。

## 构建脚本

| 脚本 | 作用 |
|---|---|
| `npm run dev` | 素材闸 + Vite 开发服务器 |
| `npm run content` | 校验 `site.yml` 与全部文章，产出 `.content/*.json` |
| `npm run media` | 素材闸：单文件 ≤ 25 MiB、MP4 编码、faststart |
| `npm run assets` | 用 sharp 生成站点根素材（底图 / 云雾 / 噪点 / favicon） |
| `npm run gate` | 中文闸 + 调试语句闸 |
| `npm run build` | 完整链：content → media → assets → gate → tsc → vite build → ssr → prerender → feeds |
| `npm run preview` | 本地预览 `dist/` |
| `npm run checklist` | 上线检查表（硬阻塞 / 占位 / 素材体检 / 依赖审计） |
| `npm run clean` | 清理 `dist/` `.ssr/` `.content/`（`--all` 连缓存与截图） |

## 部署

纯静态站点。以 Vercel 为例（Framework Preset 选 **Other**——Vite 预设会把构建命令覆盖成 `vite build`，跳过内容校验与预渲染）：

| 项 | 值 |
|---|---|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Node.js Version | 24（Vercel 默认） |

- `dist/404.html` 会被 Vercel 自动用作 404 页；`/portfolio` 这类目录索引无需额外配置。
- 托管方必须支持**目录索引**；SPA 回退式托管会让非首页首帧先闪首页内容，预渲染白做。
- ⚠ **安全响应头当前未配置**（CSP / HSTS / X-Frame-Options 等）：定稿后由托管侧声明（Vercel 用根目录 `vercel.json` 的 `headers`）。
- 绑域名只需改 `site.yml` 的 `site.url` 一行再重新构建（canonical / sitemap / rss 都由它派生）。
- 更细的说明见 `DEPLOY.md`。

## 许可

本站采用「**代码开源、内容保留**」的双许可：

- **代码**（`src/`、`scripts/`、配置文件等）：[MIT](LICENSE)
- **内容**（`source/` 下的文章、图片、视频，以及 `site.yml` 中的文案）：[CC BY-NC-ND 4.0](LICENSE-CONTENT.md)——
  可转载（须署名、非商业、不修改），不可商用、不可演绎。

## 说明

- 全站界面中文文案集中在 `site.yml`（`npm run gate` 的中文闸保证组件里零中文字面量）。
- 字体只用系统自带栈，不自托管任何字体。
- 站点不含第三方统计脚本。
