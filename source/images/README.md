# 素材归位规范（`source/images/`）

> 这一页解决一件事：**案例页/列表卡上的空槽，怎么用真素材填掉**——即文档里的「素材清零」。
> 进度看板 = `npm run checklist` 的 🟡 段（`▸ 素材清零进度 N/10`，每案两类：媒体齐 · 正文无占位）。

## 目录约定

```
source/images/
├─ CREDITS.md          ← 第三方素材来源与许可登记（缺一不上线）
├─ README.md           ← 本页
└─ <slug>/             ← 一个案例一个目录；<slug> = source/posts/portfolio/<slug>.md 的文件名
   └─ cover.webp       ← 列表卡与详情页封面（案例页的图片槽只剩这一个）
```

- ★ 图片**不再经任何暂存层**（2026-09-16 免暂存改造：`public/` 已取消，站点根静态件住 `source/site/`）：`vite.config.ts` 的 `staticFromSource` 插件在 dev 直接读 `source/images/`、build 直接写进 `dist/images/`。`*.md`（本页与 `CREDITS.md`）从不发布。
- 子目录可再任意嵌套（`source/images/<slug>/raw/` 也行）：插件递归搬运，URL 跟着目录走。

## 槽位 ↔ front-matter 字段

| 页面上看到的 | md 字段 | 建议文件名 | 规格 |
|---|---|---|---|
| 列表卡 / 详情页封面 | `cover:` | `cover.webp` | **16:9**（列表偶数位与瀑布流会裁成 4:3，主体别贴边）；≤ 1600px 宽、≤ 150KB |
| 博文顶图 | `top_img:` | `top.webp` | 21:9，按 `object-fit: cover` 裁切 |

- 一律 **WebP**（`source/` 是母版唯一家，只有 `source/` 会被搬进产物）。
- 单文件 **> 25 MiB 直接构建失败**（托管单文件上限，保守取值）；视频规格见 `DEPLOY.md` §8。
- 字体不需要管：全站走系统字体栈，**没有字体子集**这回事。

## 清零三步

1. **放文件**：`source/images/<slug>/`
2. **改 md**：`source/posts/portfolio/<slug>.md` 的 front-matter 填**素材位置**——`source/images/<slug>/cover.webp`（磁盘母版位置，反斜杠与绝对路径都认）或 `/images/<slug>/cover.webp`（交付地址）**等价**，构建期自动归一成交付地址；正文里的 `【占位…】` 换成真话。
3. **重跑**：`npm run media` → `npm run checklist`（🟡 对应项消失、`▸ 素材清零进度` 前进）。

## 当前缺口（2026-09-16 快照；以 checklist 🟡 为准）

| 案例 | 缺 |
|---|---|
| `grad-fx` | cover；正文含【占位】 |
| `ai-drama-1985` | cover；正文含【占位】 |
| `qwen-spot` | 正文含【占位】（待补清单 #3/#6） |
| `ip-character` | cover；正文含【占位】 |
| `pearl-earring-study` | —（已清零，可作样板：13.6KB 的 WebP 封面 + 无占位正文） |

## 第三方素材

落盘时在 `CREDITS.md` 加一行来源与许可；本人原创写「本人制作」；AI 生成图注明工具与提示词来源。
