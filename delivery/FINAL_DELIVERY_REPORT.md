# BodyDay · 最终交付报告（FINAL_DELIVERY_REPORT）

> 生成时间：2026-10-15（本机时间）；**V2.1 增量订正于 2026-10-16**。
> 本报告只写**有真实文件、真实命令输出或真实浏览器验证支撑**的内容。
> 未完成项一律标注为未完成，不声称已完成。
> 本版为 **V2 口径**：产品形态是「以中央唯一真实三维人体为入口的空间工作台」，
> 人体模型随作品发布（本地加载），不再依赖运行时外链。
> **V2.1（2026-10-16）**：赛前最后一轮交互纠偏——交互改为**滚轮驱动拆解**、选中为**高亮 + 其余淡化**、
> 取消选中**恢复原视角**、默认人体**中性化公开展示**；凡标注「V2.1」处与该轮口径一致。
> **2026-10-18 增量修订（本版）**：采用**路线 B**（保留自建三维舞台，**未**移植 Human Atlas 拆解引擎，原因见 `FINAL_HANDOFF_20261018.md` §1）；
> 新增**入口同节点形变**，右信息栏收敛为**「当前对象」**（通用结构卡 / 已登记实体科普卡）；主导航只有**三项——人体探索（`#/explore`）/ 器官详解（`#/detail/heart`）/ 关于（`#/about`）**；
> 门禁更新为 tsc **0 错误** / oxlint **0 error · 14 warning** / vitest **90/90** / `npm run build` 通过（2026-10-18 实测）；
> 演示视频为真实浏览器录屏成片 `delivery/demo/BodyDay_最终演示.mp4`（1920×1080，H.264；时长以 `delivery/demo/VIDEOCRAFT_PRODUCTION_LOG.md` 的 ffprobe 实测为准）；**🔴 远端推送结果需人工确认**（本地实测 ahead 4）。

## 1. Git 与版本控制

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git`（**沿用原仓库，未新建**） |
| main | 已推送至提交 `aea1669`（V1「单空间工作台」版本的最终提交） |
| V2 开发分支 | `feat/bodyday-immersive-v2`（从 `main` 的 `aea1669` 起演进）；V2、**V2.1（2026-10-16）** 与 **10/18 增量**均提交到该分支（V2：`bdf738f`、`78f5044`、`9a3dbfa`、`c90be71`；V2.1：`00ecd95`、`7899bbf`、`c3df657`；10/18：`3c2e1d4`、`c06b49a`、`b014e17`，当前 HEAD = `b014e17`），**不合并 main、不 force push** |
| 远端推送状态 | 🔴 **需人工确认**：`origin/feat/bodyday-immersive-v2` 实测停在 `7899bbf`，本地 **ahead 4**（`c3df657`、`3c2e1d4`、`c06b49a`、`b014e17` 未推送）。本日推送曾被网络阻断（`Empty reply from server` / 75 秒超时），最终以人工执行 `git push origin feat/bodyday-immersive-v2` 的返回为准 |
| 回滚点 | Git 标签 `pre-1018-baseline`（注解标签，`^{commit}` 实测 → `c3df657`）；回滚方式 `git checkout pre-1018-baseline`（只读查看）或 `git reset --hard pre-1018-baseline`（**🔴 需人工确认后再执行**） |
| 旧代码处理 | 旧「寝室 3D Demo」归档于 `body-day/src/legacy/dorm/`；V2 删除的 V1 文件保留在 Git 历史中，可随时回退 |

旧「寝室 3D Demo」由 `git mv` 归档到 `body-day/src/legacy/dorm/`，**未删除、未破坏历史**。

## 2. 完成情况

### 2.1 已完成（有实测证据）

| 项 | 证据 |
|---|---|
| **单工作台**：中央唯一真实三维人体 + 右信息栏**「当前对象」** | `body-day/src/features/workbench/ExploreWorkbench.tsx`、`KnowledgePaper.tsx` |
| **启动封面闸门**：真实字节进度（31.8 MB）→ 模型就绪 → 手动「进入探索」 | `src/features/startup/StartupCover.tsx`、`src/app/AppProviders.tsx`；状态机 `loading → ready-to-enter → entering → exploring` |
| **入口同节点形变**（10/18） | **同一个 DOM 节点**先为 240×3 px 细进度条，就绪后原地形变为约 148×44 px「进入探索」按钮；形变完成（`data-settled="true"`）前 `disabled`，100% 由真实资源就绪触发、非假倒计时；实测 `sameNode = true`（`delivery/test-evidence/verify-entry-sheet.json`） |
| **三项主导航**（10/18） | 主导航 = 人体探索（`#/explore`）/ 器官详解（`#/detail/heart`）/ 关于（`#/about`）；左上角 BodyDay 标识回到人体探索，**不是**第二具人体首页；旧「五项层级顶栏」与「自由探索 / 引导教学」双模式已删除；实测 `navItems` = `["人体探索","器官详解","关于"]`、`navCount = 3`（`verify-v2.json` / `verify-entry-sheet.json`） |
| **右信息栏只讲当前对象**（10/18） | 顶部标签「当前对象」+ 操作区（「返回上一级」/ 器官详解页的「返回探索」/ 匹配到已核实器官时**唯一**的「查看器官详解 →」）；主体是**通用结构卡**（标题 + 最多一条「大脑 · 额叶」式路径 + 一句真实空间 / 结构说明）或已登记实体科普卡。已**删除**「结构类别 / 所属系统 / 上级结构」字段堆叠、右侧常驻结构目录、尺度轴、秒级时钟、重复「取消选中」按钮与多份「继续深入 / 返回」入口（`src/domain/structureCard.ts`、`src/integrations/organBridge.ts`） |
| 进入前整个外壳 `inert` 且不可读屏；**不自动进入、不自动淡出**；加载超过 45 s 提示检查网络并可「重新加载」 | 真实浏览器实测（`inert = true`） |
| 深链 `/body`、`/systems/*`、`/organ/*`、`/cell/*`、`/explore`、`/detail/*`、`/about` **不经过封面** | 逐页实测，均直接可达 |
| **模型驱动的结构选择**：点选 / 悬停高亮 / 聚焦 / 隔离 / 逐层拆解 / 返回上一级层级栈 | `src/three/FullBodyStage.tsx`；悬停与选中叠加在真实材质自发光上；**V2.1**：选中为**高亮 + 其余淡化**（opacity 0.16 / 外壳 0.10）而非隐藏，取消选中（点空白 / Esc / 返回上一级）**恢复选中前相机视角**（实测误差 0），拖动旋转不再被当点击（位移 > 6px 忽略） |
| **自建 React Three Fiber 舞台**（Three.js r186 + R3F 9 + Drei 10），已移除 `@vixotic/vanatome-react` | `FullBodyStage.tsx` / `fullBody.ts`；其公开 API 只提供 select/focus/isolate/reset/visibleLayers，无网格位移入口，无法实现真实拆解 |
| **真实几何拆解**（需求四）：读取 GLB `extras`，按解剖系统分层对真实网格做径向平移 + 体表外壳渐进隐去 | 实测 25% 外壳不透明度 0.316；模型规模实测：整具人体 GLB **984 网格**、公开展示过滤 **17**、默认可见 **967**；拆解到 **42%** 时可见 **734**（984 − 17 − 233 外壳 = 734，体表外壳 `body-shell` 实测 **233 网格**）；位移由进度重算、从不累加。未选中结构时由**鼠标滚轮**逐层拆解 / 反向组装（每格 0.07、钳制 [0,1]，实测 `progress` 0→0.42→0.21）；**已移除桌面拆解滑杆**（触屏保留） |
| **拆解后仍可点选** | 按投影坐标实测：50% 时一次命中心脏、100% 时一次命中脾脏 |
| **真实器官隔离（器官页·页面级）** | 器官页隔离网格数实测：大脑 169、心脏 4、脾脏 1。**V2.1**：总览选中改为淡化，仅器官页仍整体收起其余结构 |
| **中性化公开展示（V2.1 新增）** | 默认人体隐去 **17 个网格**（`reproductive` 系统 14 + 体表外壳 `Urogenital region.l/.r` 2 + `Pubic hairs` 1），可见网格 984 → **967**；只过滤系统不够，`GLTFLoader` 节点名清洗后按归一化比较匹配并有单测 |
| **器官 → 细胞链路** | 大脑→神经元（`extends_to`，按钮「进入神经元」）；脾脏→白细胞（`functional`，按钮「查看白细胞」）；心脏→白细胞（`circulates_through`）**不作下钻入口** |
| **模型随包发布（离线可用）** | `body-day/public/models/z-anatomy-1.4.0-full-body.glb`（**31,849,556 字节**）；本地就绪实测 0.61–1.24 s |
| **16 个**可独立直达页面全部可访问且渲染成功 | `delivery/H5_PAGE_INDEX.md`（16 页）+ `delivery/test-evidence/screenshots/` |
| 右信息栏收敛为**「当前对象」**（通用结构卡 / 已登记实体科普卡；删除尺度轴、秒级时钟、层级目录、`paperChrome.tsx` 与「结构类别 / 所属系统 / 上级结构」字段堆叠） | `KnowledgePaper.tsx`、`src/domain/structureCard.ts` |
| 来源归入「关于」 | 文献编号、来源清单、许可长文统一收进 `/about` |
| **内容资产保留**：`domain/lessons.ts` 的 3 套跨尺度科普脚本（共 29 步）与 6 道带来源检验题 | 作为内容资产保留，不再作为用户必须选择的模式出现 |
| 错误边界与降级（不白屏） | 应用级 + 舞台级错误边界；WebGL 不可用时文字内容仍可用 |
| 版权与来源材料 | `body-day/THIRD_PARTY_NOTICES.md`、`delivery/LICENSE_AND_CREDITS.md`、`delivery/docs/SOURCES.md` |
| 源码包与比赛交付包 | `delivery/source/`（源码包）、`source-archive.zip` |

### 2.2 部分完成

| 项 | 已完成 | 未完成 |
|---|---|---|
| 拆解的产品级视觉分离 | 分层位移与外壳渐进隐去已落地并实测可见 | **层间距仍在打磨**（当前每层额外位移 = 人体包围盒半径 × 0.17） |
| 移动端 | 响应式布局已在浏览器视口 390×844 下检查（实测无横向溢出：`scrollWidth = 390 = viewport`） | **未在真机 / 模拟器截图验收** |
| 《作品开发文档》 | 正文 Markdown（`delivery/docs/作品开发文档.md`）与由它生成的 `.docx` | 排版需在 Word / WPS Office 中人工确认 |

### 2.3 未完成（如实标注）

| 项 | 说明 |
|---|---|
| **真实二维平面打包（planar packing）（重要）** | **未实现**：本作品的「展开」是**真实几何按解剖系统的分层径向分离**，**不是** Human Atlas 那种「投影到同一前视平面、行列打包」的平面展开；手册要求的「平面排列、避免重叠」**不成立**，**不得宣称**具备该能力（本次采用**路线 B**，见 `FINAL_HANDOFF_20261018.md` §1） |
| 移动端真机验收 | 未做（仅浏览器视口检查，触屏保留拆解滑杆） |
| 真实 GPU 帧率 | **未采集**（自动化验收跑在 SwiftShader 软件渲染下，故不给出任何 FPS） |
| Firefox / Safari 兼容性实测 | 未做（自动化环境为 Chromium 140） |
| **连续跨尺度转场（V2.1）** | 未做：目前是「镜头推进 + 明确的继续深入入口」，**不声称** GLB 能连续放大到细胞级 |
| **肾 / 膀胱专题（V2.1）** | 未新增：真实模型里 `urinary` 仅 3 个网格，不足以支撑专题，只保留基础展示 |
| 平台提交 / 学校盖章 | **人工环节，未代做，也未声称已提交**（截止 2026-10-18） |

> 演示视频为**真实浏览器录屏成片**：`delivery/demo/BodyDay_最终演示.mp4`（1920×1080，H.264，≤8 分钟）。
> **时长以 `delivery/demo/VIDEOCRAFT_PRODUCTION_LOG.md` 的 ffprobe 实测为准**（不写具体秒数）。
> 本机**不存在 VideoCraft skill**，按施工手册 §9.1 采用真实浏览器录屏 + 本地 ffmpeg 剪辑。
> 旧 `delivery/demo/bodyday-v2-walkthrough.mp4` 属**上一轮版本录像**（已被 `BodyDay_最终演示.mp4` 取代）。
> `delivery/demo/DEMO_VIDEO_SCRIPT.md` 为**重录 / 补录**用的分镜脚本。

## 3. 页面数量

**16 个页面**（含首页 `/` 与封底 `/about`），全部实测可独立直达、具有实质内容与独立交互。

- 页面索引的权威来源是 `body-day/src/app/routes.ts` 的 `PAGE_INDEX`，现为 **16 条**；`/about` 页会渲染「作品的可访问页面（16 页）」。
- 除封底外，各探索页共用**同一个空间工作台组件**；差别只在镜头位置与右栏内容。桌面三栏：左操作栏（**240–280px**）/ 中央三维（`minmax(0,1fr)`）/ 右信息栏（**300–360px**）；**左操作栏只在整具人体可被筛选的页面出现**（人体探索 / 人体总览 / 系统页），器官页 / 细胞页 / 器官详解页**不出现**左栏；≤1024px 收起左栏回到两栏，≤900px 右栏变为可收起的底部抽屉；
- 首页 `/` 先出完整封面闸门（暖白，与主界面同一视觉语言），就绪后手动进入；
- 16 页满足赛事「不少于 10 页（含封面封底）」且仍在「20 页以内」上限；
- 页面索引同时内置于封底 `/about` 表格，可逐条核对。

## 4. 验证结果（真实命令与输出）

### 4.1 四道门禁（2026-10-18 实测）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npx tsc -b` | ✅ **0 错误** |
| 代码规范 | `npx oxlint` | ✅ **0 error / 14 warning**（均为既有项） |
| 单元测试 | `npx vitest run` | ✅ **90 / 90 通过**（`domain` 22 + `cellGeometry` 19 + `fullBody` 29 + `structureCard` 8 + `organBridge` 12） |
| 构建 | `npx vite build`（`npm run build` 的构建段） | ✅ **成功**（`✓ built in 313ms`） |

构建产物（真实输出）：

```
主包（含探索页外壳）      index-*.js          337.46 kB │ gzip: 107.59 kB
三维运行时（按需加载）    OrbitControls-*.js  928.08 kB │ gzip: 246.42 kB
整具人体舞台（按需加载）  FullBodyStage-*.js   85.44 kB │ gzip:  26.49 kB
细胞舞台（按需加载）      CellStage-*.js       11.16 kB │ gzip:   4.09 kB
样式                      index-*.css          32.78 kB │ gzip:   6.84 kB
```

### 4.2 真实浏览器验收

| 项 | 结果 |
|---|---|
| 16/16 页逐页验收 | ✅ 全部渲染成功；探索页 `canvas = 1`、关于页 `canvas = 0`；**控制台 error 与 pageerror 计数为 0**（`verify-v2.json` + `verify-entry-sheet.json`，2026-10-18 重出） |
| 启动闸门 | ✅ 进入前 `inert = true`；就绪耗时 0.61–1.24 s；不自动进入、不自动淡出 |
| 拆解 | ✅ 实测（`verify-v2.json` 的 B 组）：进度 0 → 0.42 → 0.21，`geometryMoved=true`（真实几何位移）；**42% 时可见网格 734、外壳不透明度 0**（984 − 17 过滤 − 233 外壳 = 734；早前文档写的 748 已作废，以实测 734 为准）；镜头随位移后包围盒联动（3.05 → 3.25） |
| 拆解后点选 | ✅ 按投影坐标一次命中心脏 / 脾脏 |
| 移动端视口 390×844 | ✅ 无横向溢出（`scrollWidth = 390 = viewport`） |
| **V2.1 交互（2026-10-16）** | ✅ 滚轮 0 → 0.42 → 0.21（真实几何位移）、桌面滑杆隐藏；点体表其余结构仍可见（967）且相机聚焦；取消选中恢复误差 0；控制台 error / pageerror 均为 0（`delivery/test-evidence/verify-v2.json`） |
| **10/18 交互（2026-10-18 重出）** | ✅ 入口同节点形变（240×3 → 148×44、`sameNode = true`、形变前 `disabled`）；三项主导航 `navItems` = `["人体探索","器官详解","关于"]`、`navCount = 3`；右栏「当前对象」的通用结构卡 `defensiveWording = false`、`bodyCardStillBelow = false`；控制台 0 error（`delivery/test-evidence/verify-entry-sheet.json`、`verify-v2.json`） |

## 5. 交付物位置

| 交付物 | 路径 |
|---|---|
| 交付总索引 | `delivery/README_DELIVERY.md` |
| 页面索引与实测数据 | `delivery/H5_PAGE_INDEX.md` |
| 14 张真实运行截图 | `delivery/test-evidence/screenshots/` |
| 演示视频 | `delivery/demo/BodyDay_最终演示.mp4` |
| 源码包 | `delivery/source/`；压缩包 `delivery/source-archive.zip` |
| 赛事开发文档 | `delivery/docs/作品开发文档.md` / `delivery/docs/作品开发文档.docx` |
| 架构说明 | `body-day/docs/ARCHITECTURE.md` |
| 测试报告 | `delivery/TEST_REPORT.md` |
| 权利与来源 | `delivery/LICENSE_AND_CREDITS.md`、`delivery/docs/SOURCES.md` |
| 演示视频分镜（重录 / 补录用） | `delivery/demo/DEMO_VIDEO_SCRIPT.md` |
| 提交检查清单 | `delivery/DELIVERY_CHECKLIST.md` |
| 发布状态 | `delivery/RELEASE_STATUS.md` |
| **交付交接主文档（10/18）** | `delivery/FINAL_HANDOFF_20261018.md`（路线与结论、P0 逐条读数、未实现项、门禁、逐页、提交与回滚、交付清单、人工事项） |
| V2 设计与验收记录 | `docs/v2/`（`04_TEST_AND_ACCEPTANCE.md`、`05_FINAL_HANDOFF.md` 等） |

### 5.1 14 张真实运行截图索引

桌面截图 1440×900；移动端 390×844（2x）。2026-10-18 按当前界面（无尺度轴、右信息栏为「当前对象」、默认人体中性化）**重新采集**；另有 `delivery/test-evidence/screenshots/public-presentation/`（10 张中性化视觉核对截图）。桌面截图为当前界面：**没有双模式开关；在整具人体可被筛选的页面有左操作栏（系统筛选），器官页 / 细胞页 / 器官详解页无左栏**。

| 序号 | 截图文件 | 对应页面 / 状态 |
|---|---|---|
| 1 | `01-cover.png` | 首页 · 启动封面（就绪态，含「进入探索」） |
| 2 | `02-body.png` | 人体总览（完整人体） |
| 3 | `03-explode-25.png` | 人体总览 · 拆解 25% |
| 4 | `04-explode-100.png` | 人体总览 · 拆解 100% |
| 5 | `05-system-nervous.png` | 神经系统 |
| 6 | `06-system-cardiovascular.png` | 循环系统 |
| 7 | `07-system-lymphatic.png` | 淋巴系统 |
| 8 | `08-organ-brain.png` | 大脑（聚焦 + 隔离） |
| 9 | `09-organ-heart.png` | 心脏（聚焦 + 隔离） |
| 10 | `10-organ-spleen.png` | 脾脏（聚焦 + 隔离） |
| 11 | `11-cell-neuron.png` | 神经元 |
| 12 | `12-cell-leukocyte.png` | 白细胞 |
| 13 | `13-about.png` | 关于 · 数据与方法 |
| 14 | `14-mobile-390x844.png` | 移动端视口 390×844（抽屉收起态） |

## 6. 来源与许可证

| 资源 | 许可 | 义务 |
|---|---|---|
| 人体 / 器官解剖模型（Z-Anatomy，经 Vanatome Human Atlas 1.4.0 导出） | **CC BY-SA 4.0** | 署名 Z-Anatomy 及贡献者、标明 BodyDay 的修改、附许可链接、**以相同方式共享** |
| React / Three.js / R3F / Drei / react-router | MIT | 保留版权与许可声明 |
| 科普来源 19 条（卫健委 / WHO / NIH / CDC / OpenStax / HRA） | 见 `delivery/docs/SOURCES.md` | 逐条署名、附链接与访问日期；不复制正文与图表 |
| 程序化细胞几何、关系数据、引导脚本、文案、视觉系统 | **BodyDay 原创** | — |

- 整具人体 GLB（`z-anatomy-1.4.0-full-body.glb`，31,849,556 字节）**随作品发布**；
  许可 CC BY-SA 4.0，署名与修改说明见 `body-day/public/models/ANATOMY_LICENSE.txt`。
- **BodyDay 对模型的修改**（属 CC BY-SA 4.0「标明修改」义务，已在 `/about` 与许可文件说明）：
  分组位移拆解、体表外壳渐进隐去、系统级过滤、按真实包围盒取景、
  **体表 / 骨骼 / 肌肉统一到暖调（象牙 ↔ 陶土）、内脏保留资产自带配色**，
  以及 **V2.1 的公开展示中性化**（隐去 `reproductive` 系统与体表外壳对应几何共 17 个网格）。
- 两版 `@vixotic/vanatome-react` / `-atlas` 仍以 MIT 许可保留在 `package.json` 依赖声明中，
  但**已无任何代码引用**（V2 已从渲染路径移除）。

**分发策略**：
- **源码包** = 可运行工程本体，**含** `public/models/` 下的整具人体 GLB、构建配置与依赖说明；
- **比赛交付包** = 源码包 + 《作品开发文档》+ 实际截图 + 演示视频 + 作品说明 + 版权与科学来源材料；
- **两者不要混为一个巨大压缩包。**

**未采用**：Open Anatomy Studio 的器官 GLB（实测仅为局部解剖参照，不足以代表完整器官）、
cell-architecture-studio 的细胞 GLB（许可不明、体量过大）、LearningCell / blendercell（许可不明）。
评估记录见 `docs/REFERENCE_ADOPTION.md`。

### 6.1 本轮评估的两个开源项目（如实记录，均未整合）

- **Human Atlas（`ashemag/human-atlas`）**：代码许可经核为 **MIT（© 2026 ashemag）**、模型为 **BodyParts3D（CC BY 4.0）**，法律上可复用。但**本轮未移植**（原因是工程与时间：其渲染栈为 three ^0.159 且不用 React Three Fiber，与本工程的 three 0.186 / R3F 9 不兼容；模型约 33 MB；使用另一套 BodyParts3D 的 ID 体系，严禁与 Z-Anatomy 的结构 ID 混用），按施工手册的 45–70 分钟止损规则停止。**因此「同一前视平面二维投影打包」未实现**；本作品的展开是**按解剖系统分层的真实几何径向分离 + 体表外壳渐进隐去**，**不得**把它称作或暗示为 Human Atlas 式平面排列。
- **Anatomy（`thebuggeddev/anatomy`）**：**未确认许可 ⇒ 未复制**（仓库根目录没有任何 LICENSE/COPYING 文件，`package.json` 未声明源码许可，其 `public/models/*.glb` 资产许可也未核实）。其九器官名单（心 / 脑 / 肺 / 肝 / 肾 / 眼 / 肠 / 胰腺 / 皮肤）**仅作为目标能力参考**；器官详解由本工程**已合法分发的 Z-Anatomy 几何（CC BY-SA 4.0）** + 自行撰写的中文内容实现。

## 7. 部署

**无公开部署地址**。本作品未部署到任何公网环境，也未声称已上线。

本地与静态托管部署方式：

```bash
cd body-day                    # 或 delivery/source/
npm ci                        # 或 npm install
npm run dev                   # http://localhost:5173/
npm run build                 # 产物 dist/，纯静态
```

`dist/` 可直接部署到任意静态托管；使用 HashRouter，**无需服务端重写规则**。
模型随包发布在 `public/models/`，**离线 / 断网也能运行**；如需镜像，
可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本（1.4.0）镜像。

## 8. 剩余需人工处理的事务

1. **学校审核推荐**：汇总、盖章、邮寄（赛事要求，本 Agent 不代做）。🔴
2. **网络平台报名与提交**：截止 **2026-10-18**。当前**未提交、未上线**。🔴
3. **演示视频**：`delivery/demo/BodyDay_最终演示.mp4`（1920×1080，H.264；时长以 `delivery/demo/VIDEOCRAFT_PRODUCTION_LOG.md` 的 ffprobe 实测为准）；如需更高规格版本，
   按 `delivery/demo/DEMO_VIDEO_SCRIPT.md` 在装有真实 GPU 的机器上重录 / 补录。🔴（确认 ≤8 分钟）
4. **《作品开发文档》`.docx` 复核**：请在 Word 或 WPS Office 中确认排版与截图插入、**无错版**。🔴
5. **移动端真机走查**：iOS Safari 与 Android Chrome 各走一遍（浏览器视口检查已完成）。
6. **就「作品此前在 GitHub 公开」一事向校赛负责人核实**：比赛总通知要求作品未公开发表，本仓库曾公开可访问；
   **转为私有不消除「曾公开」的事实，不得声明「作品从未公开」**。🔴
7. **确认远端推送结果**：`origin/feat/bodyday-immersive-v2` 实测停在 `7899bbf`，本地 **ahead 4**；
   本日推送曾被网络阻断，最终请以人工执行 `git push origin feat/bodyday-immersive-v2` 的返回为准。🔴

## 9. 观察记录（非本 Agent 操作）

工作目录根下原有的比赛附件 `附件1/2/3 …doc(x)` 与任务书 Markdown 文件
受 `.gitignore`（`*.doc` / `*.docx` 忽略项）影响未入库；
任务书内容与竞赛规则已在 `docs/BASELINE_AND_REFERENCES.md` 中完整记录，
不影响已完成的工作；但**提交前需人工确认这些原始附件仍可用**。
