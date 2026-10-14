# BodyDay · 参考采纳记录（REFERENCE_ADOPTION）

> 记录「读到了什么、借鉴了什么、明确不借鉴什么、有无复制代码/素材与授权证据」。全部基于本机真实文件与外网真实响应。

## 1. 两个本地参考路径

| 路径 | 真实存在 | 性质 |
|---|---|---|
| `/Users/morton_cheung/Desktop/比赛/References/design-references` | 是 | 视觉/交互/动效/前端能力参考库（GSAP、anime、lottie-web、motion、inspira-ui、gsap-skills、archify、impeccable、awesome-design-md 等） |
| `/Users/morton_cheung/Desktop/比赛/大数据分析/AgriScope/frontend` | 是 | 用户长期打磨的生产级 React 前端（设计系统、动效语言、单 Canvas 架构） |

两者**不是同一目录**，已分别判定，未混用。**未修改、未删除任何参考目录文件。**

## 2. 从 AgriScope 借鉴（设计原则，非照搬内容）

| 借鉴项 | 真实来源文件 | 在 BodyDay 的落地 |
|---|---|---|
| 暖白纸面 / 墨色 / 暖灰体系 | `src/design/tokens.css` | BodyDay `--bd-paper/--bd-ink/--bd-ink-muted` 等，色值沿用同一取向 |
| 展示衬线 + 正文无衬线 + 标签等宽 | `src/design/typography.css` | BodyDay 字体令牌同名思路 |
| 直角优先、细线分隔、低密度、大主角 | `docs/VISUAL_BASELINE.md`、`layout.css` | 全部 BodyDay 控件直角、1px 细线、3D 为主角 |
| 六类动效语义（hover/selection/route/camera/…）与「删掉它是否更难理解」判据 | `docs/MOTION_LANGUAGE.md` | BodyDay 保留 hover/selection/route/camera/scale 五类，删除纯装饰动画 |
| `prefers-reduced-motion` 降级为**瞬时** | `motion.ts` `motionDuration()` | BodyDay `motionDuration()` 同规则 |
| 单活跃 Canvas + `frameloop="demand"` + 相机平滑推近 + 看门狗超时 | `docs/FRONTEND_ARCHITECTURE.md` | BodyDay 路由级单 Canvas；相机推近带超时兜底 |
| 证据/来源边界明确、不滚动凑数 | `layout.css`、`VISUAL_BASELINE.md` | BodyDay 每张知识卡附来源 ID，测验附解释与来源 |

**明确不借鉴**：AgriScope 的农业地图、城市/作物指标、研究文章与数据表、后端合约、辽宁几何与材质、`/opening` 状态机与机位、76 点研究编号；不复制其任何源码文件到 BodyDay。

## 3. 从 `design-references` 借鉴

| 目录 | 实测版本/许可 | 采纳结论 |
|---|---|---|
| `GSAP` | 3.15.0 / GreenSock standard "no charge" | **不引入运行时依赖**。仅借鉴其「时间轴 + ScrollTrigger 式揭示」的分镜思维，用 CSS/自研实现 |
| `gsap-skills` | MIT | 仅读其规范文档 |
| `anime` | animejs 4.5.0 / MIT | 不引入 |
| `lottie-web` | 5.13.0 / MIT | 不引入（本项目用 SVG/几何动画，无需 AE 管线） |
| `motion` | MIT | 不引入（framer-motion 体量大；改用 `layout` 连续性与 CSS 变量） |
| `inspira-ui` | Vue/Nuxt 生态 | 不引入（技术栈不兼容）；仅作视觉灵感 |
| `awesome-design-md`、`archify`、`impeccable` | 见各自 LICENSE | 仅作清单/规范参考 |

**未复制上述库的任何代码或素材进 BodyDay。**

## 4. 从开源医学/解剖项目采纳

| 来源 | 采纳内容 | 授权与义务 |
|---|---|---|
| **Vanatome**（`@vixotic/vanatome-react` 0.1.6 + `@vixotic/vanatome-atlas` 0.1.4，npm） | 人体全息解剖 Viewer、层级/图层/隔离/聚焦控制器、atlas 契约 | **代码 MIT**（保留版权与许可声明，声明为第三方依赖） |
| **Vanatome 官方 atlas 1.4.0**（`atlas.vanatome.vixotic.in`，CORS `*`） | 12 个系统 GLB（心血管/神经/淋巴/呼吸/骨骼/内分泌…），含 `brain*`、`spleen`、`heart` 结构 ID | **资产 CC BY-SA 4.0**（Z-Anatomy 衍生）。分发适配版本须：署名 Z-Anatomy / Gauthier Kervyn / Marcin Zielinski、标明 BodyDay 的修改、附许可链接、**以相同方式共享**。运行时从官方 CDN 加载，不随包再分发原始 GLB |
| **Open Anatomy Studio**（`HongChao6/open-anatomy-studio` → `public/models/`） | 独立器官 GLB：`brain.glb`、`heart.glb`、`spleen.glb`（+kidney/liver/lungs/pancreas 备选） | 代码 MIT；**模型为 HRA / HuBMAP「CC BY 4.0」**，署名「HRA 3D organ models © Human Reference Atlas (CC BY 4.0), HuBMAP.」。经 Meshopt 压缩（`tejasghalsasi/anatomy-atelier`）。**运行时经 CDN 加载** |

**明确不采纳**：
- `cclank/cell-architecture-studio` 的细胞 GLB —— 其大型细胞模型再分发许可不清（任务书已提示白细胞 54MiB、植物细胞许可不明）。BodyDay **不使用其模型与源码**，改为**自研程序化神经元/白细胞几何**。
- `GordenSun/LearningCell`、`JDerekLomas/blendercell`、`QI-flowy/3DArchitectureStudio` —— 教学素材/许可不明，不采纳。
- `HemanSaga/HumanAnatomy`、`Grypa-JJ/anatomy-atlas-3d`、`cimmonster1-art/Bio-Galaxy` —— 许可不明或与主选重复，不采纳。
- `hubmapconsortium/hra-ui` 等关系数据仓库 —— 未直接引入代码；科学关系数据由 BodyDay 自撰并标注权威来源（WHO/NIH/卫健委/教材）。

## 5. 原创性声明

BodyDay 的**产品结构（双模式、跨尺度导航、尺度转场）、交互设计、视觉系统、页面编排、科普文本、关系数据模型、引导课程状态机、程序化细胞几何**均为本项目独立设计实现。第三方仅提供：
1. 人体/器官的解剖几何数据（Vanatome atlas / HRA，已按许可署名）；
2. 通用开源库（React、Three.js、R3F、Drei、react-router 等）。

BodyDay **不是**任何参考项目的二次发布，也未拼接现成网站。

## 6. 授权证据

- Vanatome 代码许可：仓库根 `LICENSE`（MIT）；资产许可：`ASSET-LICENSE.md`（明确 Z-Anatomy / CC BY-SA 4.0 与 ShareAlike 义务）。
- Open Anatomy Studio：根 `LICENSE`（MIT，Copyright (c) 2026 HongChao6）；`THIRD_PARTY_ASSETS.md`（HRA CC BY 4.0、来源 release v1.2、中间仓库 commit、压缩方式、校验和、检索日期 2026-08-04）。
- 上述许可文本将在 `THIRD_PARTY_NOTICES.md` 与 `LICENSE_AND_CREDITS.md` 中完整保留。
