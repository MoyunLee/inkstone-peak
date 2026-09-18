# 图像素材来源与许可（CREDITS）

> 规格出处：20-设计规范 §3「源画许可记 source/images/CREDITS.md」；10 §6 素材归位映射。
> 规矩：任何第三方图像（源画、案例渲染图、过程图）落进 source/images/ 时，必须在此加一行来源与许可，缺一不上线。

## Hero 背景山水

- **定稿（用户拍板"画随便就可以"）**：**程序化生成的"数据山"** —— 由 `src/fx/scene-data.ts` 用固定 LCG 种子（20260905）+ 中点位移山脊算法生成，三层远/中/近岭，**无第三方图像、无外部版权**。构建期 `scripts/assets.ts` 预烘为 `source/site/hero-base.png`（无 JS 底图）。此即上线态，非占位。
- **可选后期升级（非门槛）**：若日后想换真《富春山居图》手卷（台北故宫 open data / Met CC0），流程为——灰度→拉对比→按 Hero 比例裁切（留大留白放标题）→ 存 `source/images/source-scroll.png`；`scene-data` 的解析采样替换为对该图的离屏 canvas 网格采样（同一采样管线，替换源图即可，见样片注），并在本节补一行许可。当前不需要。

## 案例图像（work/*）

- 现状：全部案例封面/过程图/Before-After 为**占位框**（content.ts 将 `【占位】` 归一为 null，组件渲染占位样式，见 10 §4.1「上线前禁占位」）。
- 待用户提供（99 §4 素材缺口 / 简历待补清单）：
  - `ip-character`：重渲染 3~5 图 + 拓扑/贴图 Before-After（待补清单#1，最高优先）
  - `ai-drama-1985`：准确播放数 + 数据复盘 + B 站合集外链
  - `grad-fx`：首个技能演示 GIF（约 15 秒）
  - `qwen-spot`：官方命题页截图 + 提交记录
- 每张图落 `source/images/<slug>/*` 时，若含第三方素材（如游戏截图、AI 生成图），在此登记来源；本人原创过程图注明「本人制作」。

### 已登记

| 案例 | 文件 | 来源与许可 |
|---|---|---|
| `pearl-earring-study` | `source/images/pearl-earring-study/cover.webp` | **本人制作** —— Blender 临摹练习，原画 Vermeer《戴珍珠耳环的少女》(c.1665) 属公有领域。教程出处：https://www.bilibili.com/video/BV14u41147YH/ 。压缩前原图（1920×1080 PNG / 852 KB）不随仓库分发，存于仓库外（如 `<仓库外>/素材/pearl-earring/`） |

## 字体

- 20 §2：霞鹜文楷（SIL OFL 1.1）/ 思源宋体（SIL OFL）/ 霞鹜文楷等宽（SIL OFL），均免费商用。
- **现状与定论（2026-09-16 用户令）：只用系统自带字体，不引入外来需下载的字体**——全站无 `@font-face`、无 `/fonts/`，因此本文件无需登记字体。「子集自托管」已否决（缘由见 `Dev_Docs/90` 已否决表）。
