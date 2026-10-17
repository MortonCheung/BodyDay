# BodyDay · 交付交接文档（FINAL_HANDOFF_20261018）

> 作品：**BodyDay · 身体的一天**｜2026 辽宁省大学生科普设计大赛 · 非医类健康科普赛道 · 第 4 组（H5）
> 文档日期：**2026-10-18**；分支：`feat/bodyday-immersive-v2`；应用目录 `body-day/`；交付目录 `delivery/`。
> **编写口径**：只写仓库里能真实读到、或有真实命令输出 / 浏览器读数支撑的内容。凡是本 Agent 无法直接确认的，
> 一律标注 **🔴 未验证** 或 **🔴 需人工确认**，绝不写成「已完成」。
> 标记约定：`✅ 实测` = 有真实文件/命令输出/浏览器 JSON 佐证；`🟡 部分` = 部分落地但条件受限；`🔴` = 未验证 / 需人工确认。

---

## 1 采用路线与结论

**本次采用 **路线 B**：保留本工程自建的 React Three Fiber 三维舞台，不移植 Human Atlas（`ashemag/human-atlas`）的拆解 / 平面打包引擎。**

选择路线 B 的理由（如实记录）：

1. **技术栈不兼容**：Human Atlas 的渲染栈基于 **three `^0.159`，且不使用 React Three Fiber**；本工程是 **three 0.186 + R3F 9**。两者无法在同一渲染路径上混用，移植等于重写舞台。
2. **ID 体系不同**：Human Atlas 使用**另一套 BodyParts3D ID 体系**，与本工程自建舞台所用的 Z-Anatomy / Vanatome 1.4.0 结构 ID（实测 749 个唯一 `anatomyId`）不对齐，节点映射需重建。
3. **体积与许可**：Human Atlas 需要下载约 **154 MB** 仓库（**代码 MIT**，**几何 BodyParts3D 为 CC BY 4.0**），引入后需一并承担其几何资产的署名与再分发义务。
4. **最直接的原因——当时网络不可达**（验证日期 **2026-10-17 / 10-18**）：
   - GitHub **推送两次失败**：一次返回 **`Empty reply from server`**，一次 **75 秒连接超时**；
   - 浅克隆 `ashemag/human-atlas` **在 3.1 MB 处停滞**，工作树始终**未检出**；
   - 其 **Vercel 在线演示返回 `503 DEPLOYMENT_PAUSED`**。

在上述条件下，**90 分钟止损窗口内不具备完成移植的条件**，故按手册预定回退策略选择路线 B：**把工程内已经能真实完成的几何拆解做扎实**，而不是引入一个下载不到、栈不兼容的外部引擎。

> 🔴 结论影响：路线 B 保持了「真实三维人体 + 真实几何分层拆解」的能力，但**放弃**了 Human Atlas 风格的**同平面行列打包**（见 §3 第 ① 条，本作品不具备该能力，交付材料中不得宣称）。

---

## 2 已实现的交互（逐条对照手册 P0）

下表每条均为**真实浏览器读数**。除特别标注外，证据文件为
`delivery/test-evidence/verify-entry-sheet.json`（入口 / 顶栏 / 结构卡）与
`delivery/test-evidence/verify-v2.json`（A–G 交互）；两者运行环境均为
**Chrome for Testing + SwiftShader 软件渲染**，视口 1440×900。

| # | 手册 P0 项 | 实现 | 真实浏览器读数 |
|---|---|---|---|
| 1 | 入口同节点形变 | ✅ 实测 | `.bd-entry` 内可交互控件数 **1**；加载态为 **240×3 px** 进度条 → 就绪后**同一个 DOM 节点**（脚本打过 `dataset.identity` 标记 → `sameNode = true`）形变为 **148×44 px**；形变进行中 `disabled = true`；点击后 `location.hash = #/body`；封面卸载（`.bd-entry` 数量 **0**）。 |
| 2 | 五项顶栏 | ✅ 实测 | 顶栏项 = `["身体","系统","器官","细胞","关于"]`，共 **5** 项（`navCount = 5`），分别落到真实路由 `/body`、`/systems/nervous-system`、`/organ/brain`、`/cell/neuron`、`/about`。 |
| 3 | 滚轮驱动的真实几何拆解 | ✅ 实测 | `progress` **0 → 0.42 → 0.21**（向下拆 / 向上合）；`geometryMoved = true`（读**心脏包围盒中心**的真实位移判定，非状态值）；选中结构后滚轮**不再**拆解。 |
| 4 | 选中淡化 | ✅ 实测 | 选中后可见网格数 **967**（选中前后一致，即其余结构是**淡化而非隐藏**，`othersStillVisible = true`）；外壳不透明度 **1 → 0.10**（拆解约 40% 起移出可见集合与射线层）。 |
| 5 | 空白 / Esc 恢复相机快照 | ✅ 实测 | 聚焦心脏前快照 `position (0.0609, 1.0165, 3.1244)` / `target (0.0609, 0.9428, −0.0089)` → 点空白后 **`positionDelta = 0`、`targetDelta = 0`、`restored = true`**（点空白与 Esc 语义一致）。 |
| 6 | 任意可点选结构的真实卡 | ✅ 实测 | 拆解 **0.56** 后点击一个真实骨骼结构：卡片字段 `结构类别 / 所属系统 / 图谱来源` = `解剖结构 / 骨骼系统 / Z-Anatomy 1.4.0（CC BY-SA 4.0）`；页面文本中 **不存在**「尚未编入 / 还没有独立科普卡片 / 不编造」等防御句（`defensiveWording = false`）；**不再**在下方重复出现「人体」总览卡（`bodyCardStillBelow = false`）。 |
| 7 | 中性化公开展示 | ✅ 实测 | 默认可见网格 **967**（984 − 17）；移除项 = 生殖系统 **14** + 体表 `Urogenital region` **×2** + `Pubic hairs` **×2**（`publicFilterRemoved = 17`）。 |
| 8 | 来源集中在「关于」 | ✅ 实测 | `/about` 文本含 `CC BY-SA 4.0`（`aboutHasLicense = true`）；探索界面不再展开来源与许可长文。 |

> 补充（跨尺度，非上表 P0 项但本轮一并实测）：`/organ/brain` 隔离网格 **169**，可点「进入神经元」并真实到达 `/cell/neuron`；`/organ/spleen` 可点「查看白细胞」；全程 `canvasCount = 1`，控制台 **0 error / 0 pageerror**。

> 🔴 一致性提醒（如实记录）：`verify-v2.json`（2026-10-17 13:07）中 A / F 组的 `navItems` 仅记录到 `["关于"]`，
> 这是因为该脚本运行于**五项顶栏恢复之前**；五项顶栏由 `verify-entry-sheet.json`（2026-10-17 16:48）单独验证。
> 两文件均为历史真实证据，未做覆盖，请对照阅读。

---

## 3 未实现 / 降级的功能（必须显眼）

> 以下各项**不得**在提交材料中写成已完成；请保留本节的醒目程度，不要淡化。

1. **① 真实二维平面打包（planar packing）未实现（重要）**：本作品的「展开」是**真实几何按解剖系统的分层径向分离**，**不是** Human Atlas 那种「投影到同一前视平面、按行列打包」的平面展开。因此手册所要求的最终状态「**平面排列、避免重叠**」在本作品**不成立**。**交付材料中不得宣称本作品具备真实二维平面打包能力。**
2. **② 真实 GPU 帧率未采集**：自动化验收运行在 **SwiftShader 软件渲染**下，不能代表真机 GPU 帧率；**不提供任何 FPS 数字**。
3. **③ 移动端仅做 390×844 视口检查，未真机验收**：仅在浏览器视口 390×844 下检查（`scrollWidth = 390 = viewport`，无横向溢出）；**没有 iOS Safari / Android Chrome 真机或模拟器截图验收记录**。
4. **④ 连续跨尺度镜头转场未做**：器官 → 细胞是「**镜头推进 + 明确的继续深入入口**（按钮跳转）」，**不声称** GLB 能连续放大到细胞级。
5. **⑤ 肾脏 / 膀胱未新增专题**：真实模型里 `urinary` 系统**仅 3 个网格**，不足以支撑专题，只保留基础展示。
6. **⑥ 骨盆区域精确性与外生殖器形态处理**：采用「**以真实骨盆 / 肌肉结构替代、未做中性补片**」的方式；正 / 侧 / 背与骨盆近观已核对**无空洞**。这是**中性化展示**，不是新建一套无性征人体——近观会看到移除外壳后露出的真实肌肉 / 骨盆结构（解剖切口观感，已如实记录，未用遮挡物掩盖）。

---

## 4 真实测试与门禁结果

> 本节的四道门禁命令由本 Agent于 **2026-10-18** 在 `body-day/` 下**重新执行**，以下为真实输出；浏览器验收脚本的输出以 JSON 文件形式留存。

### 4.1 四道门禁（2026-10-18 实测）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npx tsc -b` | ✅ **0 错误**（exit 0） |
| 代码规范 | `npx oxlint` | ✅ **0 error / 13 warning**（`Found 13 warnings and 0 errors`，60 files；均为既有项） |
| 单元测试 | `npx vitest run` | ✅ **76 / 76 通过**：`structureCard` 6 + `domain` 22 + `fullBody` 29 + `cellGeometry` 19 = 76（4 test files 全绿） |
| 构建 | `npx vite build` | ✅ **成功**（`✓ built in 313ms`） |

构建产物（真实输出，`dist/assets/`）：

```
index.html                                  1.41 kB │ gzip:   0.89 kB
index-*.css                                30.17 kB │ gzip:   6.41 kB
CellStage-*.js                             11.16 kB │ gzip:   4.09 kB
FullBodyStage-*.js                         85.44 kB │ gzip:  26.49 kB
index-*.js                                333.90 kB │ gzip: 106.52 kB
OrbitControls-*.js                        928.08 kB │ gzip: 246.42 kB
(体积告警：OrbitControls 分块 > 500 kB，为已知项，功能不受影响)
```

### 4.2 浏览器验收（两组脚本）

| 脚本 | 覆盖 | 输出证据 |
|---|---|---|
| `body-day/scripts/verify-v2.mjs` | **A–G**：默认人体展示、滚轮拆解/组装、选中淡化、视角恢复、跨尺度链路、UI 结构、控制台稳定性 | `delivery/test-evidence/verify-v2.json` + 截图目录 `…/screenshots/v2-interaction/` |
| `body-day/scripts/verify-entry-sheet.mjs` | **入口同节点形变 / 五项顶栏 / 通用结构卡 / 局部结构卡 / 控制台** | `delivery/test-evidence/verify-entry-sheet.json` + 截图目录 `…/screenshots/1018-entry/` |

> 两组脚本均用真实输入（真实滚轮、真实点击、真实拖动）驱动，并读取页面在**开发模式**下上报的运行时读数
> （`window.__BODYDAY_STAGE__`），不接受「状态值看起来对」的判断。

---

## 5 逐页通过情况

> 页面与路径**逐条来自本工程真实路由源文件** `body-day/src/app/routes.ts`（`PAGE_INDEX`，共 **11** 条）与
> `body-day/src/app/resolveView.ts`（实际解析规则）。下表「本次实测结论」以
> `delivery/test-evidence/screenshots/`（逐页截图，见 `capture.json` 的 `shots`）、
> `verify-v2.json`、`verify-entry-sheet.json` 为依据。**本 Agent 未逐页重跑截图脚本**，故「本次实测结论」是**对既有证据的核对结论**，不是本轮新采集。

| # | 页面 | 路径 | 可独立直达 | 本次实测结论 |
|---|---|---|---|---|
| 01 | 首页 · 启动封面与完整人体 | `#/`（`/`） | 是（先出封面闸门，**需点击「进入探索」**才进入内部） | ✅ 入口形变与进入取证于 `verify-entry-sheet.json`；`01-cover.png` 有截图。进入后落到 `#/body`；`location.hash = #/body`、封面卸载。 |
| 02 | 人体总览 | `#/body` | 是（深链**不经封面**） | ✅ `verify-v2.json` A / B / C / D 均在此页取证；`02-body.png`、`03-explode-25.png`、`04-explode-100.png`。 |
| 03 | 神经系统 | `#/systems/nervous-system` | 是（深链不经封面） | ✅ `resolveView` 命中 `SYSTEM_MAP['nervous-system']`；`05-system-nervous.png` 有截图；console error/pageerror = 0（`verify-v2.json` G）。 |
| 04 | 循环系统 | `#/systems/cardiovascular-system` | 是（深链不经封面） | ✅ 命中 `SYSTEM_MAP`；`06-system-cardiovascular.png` 有截图；console = 0。 |
| 05 | 淋巴系统 | `#/systems/lymphatic-system` | 是（深链不经封面） | ✅ 命中 `SYSTEM_MAP`；`07-system-lymphatic.png` 有截图；console = 0。 |
| 06 | 大脑 | `#/organ/brain` | 是（深链不经封面） | ✅ `verify-v2.json` E：隔离网格 **169**，可进神经元并到达 `/cell/neuron`；`verify-entry-sheet.json` 局部结构卡在此页取证；`08-organ-brain.png`。 |
| 07 | 心脏 | `#/organ/heart` | 是（深链不经封面） | ✅ `verify-v2.json` D 聚焦心脏并恢复视角；`capture.json` 心脏隔离网格 **4**；`09-organ-heart.png`。 |
| 08 | 脾脏 | `#/organ/spleen` | 是（深链不经封面） | ✅ `verify-v2.json` E：脾脏页标题「脾脏」、可「查看白细胞」；`capture.json` 脾脏隔离网格 **1**；`10-organ-spleen.png`。 |
| 09 | 神经元 | `#/cell/neuron` | 是（深链不经封面） | ✅ `verify-v2.json` E 真实到达该页（`neuronReached = true`）；`11-cell-neuron.png`。 |
| 10 | 白细胞 | `#/cell/leukocyte` | 是（深链不经封面） | ✅ `resolveView` 命中 `CELL_IDS`；`12-cell-leukocyte.png` 有截图；console = 0。 |
| 11 | 关于 · 数据与方法 | `#/about` | 是（深链不经封面） | ✅ `verify-v2.json` F：`aboutHasLicense = true`（含 CC BY-SA 4.0）；该页 `canvasCount = 0`（不加载 three.js）；`13-about.png`。 |

**整体结论**：11 / 11 页均可独立直达并完成渲染；探索页活跃 Canvas = 1，关于页 = 0；控制台 error 与 pageerror 计数为 0（`verify-v2.json` G）。

> 说明：`/systems/:id` 为**参数化路由**，`SYSTEM_MAP` 收录 11 个系统 ID，任一均可解析（本例对外声明的系统页为 3 个：神经 / 循环 / 淋巴）。器官页限定 `brain / heart / spleen`，细胞页限定 `neuron / leukocyte`（见 `resolveView.ts` 的 `ORGAN_IDS` / `CELL_IDS`）。

---

## 6 最新提交与回滚方式

### 6.1 分支与提交（本 Agent 用 `git log` 实测）

| 项 | 值 |
|---|---|
| 分支 | `feat/bodyday-immersive-v2`（当前 HEAD = `b014e17`） |
| 本日（10/18）提交 | `3c2e1d4`（收录 10/18 施工手册）、`c06b49a`（入口同节点形变 + 五项顶栏）、`b014e17`（任意可点选结构真实卡） |
| 此前 V2.1 提交 | `c3df657`、`7899bbf`、`00ecd95` |
| 旧 V2 提交 | `bdf738f`、`78f5044`、`9a3dbfa`、`c90be71` |

### 6.2 回滚点与回滚方式

| 项 | 值 |
|---|---|
| 回滚标签 | Git 标签 **`pre-1018-baseline`**（注解标签，`git rev-parse pre-1018-baseline^{commit}` 实测 → **`c3df657`**，即 V2.1 + 文案/动效打磨） |
| 只读查看 | `git checkout pre-1018-baseline` |
| 硬回滚 | `git reset --hard pre-1018-baseline` —— **🔴 需人工确认后再执行**（会丢弃 10/18 三个提交在工作树中的效果，属破坏性操作） |

### 6.3 远端推送状态（如实写）

| 项 | 值 |
|---|---|
| 远端跟踪引用 | 施工中实测为 `7899bbf`；本次推送后已推进到 `b3ae71d` |
| 本地相对远端 | **已同步**：10/18 的 4 个提交 `c3df657`、`3c2e1d4`、`c06b49a`、`b014e17` 已推送 |
| 推送尝试 | 本日推送**曾被网络阻断**（一次 `Empty reply from server`、一次 75 秒连接超时），网络恢复后重试成功 |
| 结论 | **✅ 实测已推送**：`git push origin feat/bodyday-immersive-v2` 返回 `7899bbf..b3ae71d`（随后交付文档同步提交 `b3ae71d` 亦已推送）。远端分支现为 `b3ae71d`，本地工作区干净。`main` 未被合并、未被强推。 |

---

## 7 交付材料清单与一致性

| 交付物 | 路径 | 状态 / 说明 |
|---|---|---|
| 源码副本 + 压缩包 | `delivery/source/`、`delivery/source-archive.zip` | 含 **31.8 MB** 解剖模型（`z-anatomy-1.4.0-full-body.glb`，实测 **31,849,556 字节**）与许可文件；离线可跑 `npm ci && npm run dev`。`zip` 实测 **22,737,843 字节**，修改时间 2026-10-18 00:51。 |
| 赛事《作品开发文档》 | `delivery/docs/作品开发文档.docx`（源 `…/作品开发文档.md`） | 含 **14 张真实截图**；`.docx` 实测 **4,324,101 字节**，修改时间 2026-10-18 00:51。 |
| 演示视频 | `delivery/demo/bodyday-v2-walkthrough.mp4` | **约 105 秒**（`ffprobe` 实测 duration = **105.4 s**）；真实浏览器录屏，软件渲染下**不够流畅**，**建议在真机 GPU 环境重录**。 |
| 测试证据 | `delivery/test-evidence/` | `verify-v2.json`、`verify-entry-sheet.json`、`capture.json`，以及截图目录 `screenshots/`（含 `v2-interaction/`、`1018-entry/`、`public-presentation/`）。 |
| 页面索引 | `delivery/H5_PAGE_INDEX.md`、`body-day/docs/H5_PAGE_INDEX.md` | 11 页，逐页截图与「该页能做什么」。 |

> 🔴 一致性提醒：演示视频**当前成片约 105 秒**；旧版交付文档中出现的「81 秒」为**过期说法**，已在本次订正为约 105 秒。
> 视频长度与流畅度**以真机 GPU 重录为准**（见 §8）。

---

## 8 必须由人工完成的事

> 本 Agent 不代做、不声称已完成。逐条标注。

| # | 事项 | 状态 |
|---|---|---|
| 1 | **平台申报与上传**（网络平台报名 / 作品提交，截止 2026-10-18） | 🔴 待人工（当前未提交、未上线） |
| 2 | **学校审核推荐与盖章报送**（汇总 / 盖章 / 邮寄） | 🔴 待人工 |
| 3 | **确认开发文档 `.docx` 在 Word 中打开无错版**（排版、截图插入效果） | 🔴 待人工 |
| 4 | **把演示视频确认到 ≤ 8 分钟**（当前成片约 105 秒，满足 ≤8 分钟，但仍建议人工复核） | 🔴 待人工确认 |
| 5 | **就「作品此前在 GitHub 公开」一事向校赛负责人核实** | 🔴 **需人工确认（重要）** |
| 6 | **真实 GPU 环境下重录视频**（可选但推荐） | 🟡 可选 / 推荐 |

关于第 5 条的事实说明（**必须如实陈述，不得改写**）：
比赛总通知要求作品**未公开发表**；本仓库**曾公开可访问**。**转为私有不消除「曾公开」的事实**，
因此**不得声明「作品从未在 GitHub 公开」**。请人工向校赛负责人核实该历史是否影响参赛资格，并据实说明。

---

## 9 页面数量合规

- 赛事要求：H5 交互式作品**不少于 10 页、控制在 20 页以内**，且每页有真实内容、可单独打开（含封面）。
- 以 `body-day/src/app/routes.ts` 的 `PAGE_INDEX` **真实条目数**计：**共 11 页**（含首页与关于）。
- 封面 `#/` 与其余页面的关系：封面 `#/` 是**独立的一页**（启动封面 + 手动进入）；其余 **10 页**（`/body`、3 个系统页、3 个器官页、2 个细胞页、`/about`）**共用同一个空间工作台组件与同一条右侧知识纸条**，差别只在**镜头位置与纸条内容**，不各自重新加载三维场景；**深链直达这些页面时不经封面**。
- 结论：**11 页**满足「不少于 10 页」，且远低于「20 页以内」上限；页面索引同时内置于 `/about` 表格，可逐条核对。

---

*本文件为 2026-10-18 交付交接主文档。所有数字均来自本 Agent 在仓库中的真实读取或 2026-10-18 的真实命令输出；未确认项已按 §开头口径标注。*
