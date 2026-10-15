# BodyDay V2 · 本轮交接（05）

- 日期：2026-10-15
- 分支：`feat/bodyday-immersive-v2`（从 `main` 的 `aea1669` 起演进；每个阶段单独提交，不合并 `main`、不 force push）
- 相关记录：`docs/v2/00_BASELINE_AND_FEASIBILITY.md`、`01_PRODUCT_BEHAVIOR.md`、`02_ARCHITECTURE_AND_INTERACTION.md`、`03_EXPLOSION_FEASIBILITY.md`、`04_TEST_AND_ACCEPTANCE.md`

---

## 1. 一句话结论

V2 把作品从「左栏结构目录 + 双模式 + 内嵌引导」的教学工作台，改成了**以中央真实三维人体为唯一入口的空间工作台**：独立封面闸门 → 模型真正就绪 → 手动进入 → 在模型上点选 / 聚焦 / 隔离 / **逐层真实拆解** → 从器官下潜到细胞；人体模型改为随作品发布，不再依赖运行时外链。

---

## 2. 五项决策的执行结果

| 决策 | 执行结果 |
| --- | --- |
| 1. 新旧要求冲突以 V2 为准 | 删除顶部「自由探索 / 引导教学」双模式及其本地持久化状态；删除左侧常驻结构目录（**没有**搬到右侧或弹窗）；开场改为完整封面 + 手动进入。 |
| 2. 人体拆解用真实几何 | 自建 R3F 舞台直接读取整具人体 GLB，按解剖系统分层对**真实网格**做径向位移，配合体表外壳渐进隐去。Human Atlas 实测否决（three ^0.159、非 R3F、仓库 154 MB、另一套 ID 体系），改用同源 `curated-full-body` 单文件人体 + 自建舞台。 |
| 3. 交付缺口 | `.gitignore` 精确放行 `delivery/docs/作品开发文档.docx`（附件仍忽略）；明确「源码包 ≠ 比赛交付包」；修正 RELEASE_STATUS 的过期表述；V2 记录统一写在根 `docs/v2/`。 |
| 4. 独立开发分支 | `feat/bodyday-immersive-v2`，小步提交，未合并 `main`，未 force push，旧实现可回退（Git 历史保留）。 |
| 5. 时间有限但不降标准 | 存活路径优先（封面闸门、删双模式、模型驱动点选、真实器官聚焦、知识面板简化、来源归「关于」、响应式）全部完成；核心攻关（真实拆解 + 拆解后选中 + 器官→细胞）完成并实测；视觉细节继续打磨。 |

---

## 3. 代码结构与文件地图

**新增**

| 文件 | 职责 |
| --- | --- |
| `src/app/AppProviders.tsx`（重写） | 启动闸门状态机 `loading → ready-to-enter → entering → exploring`；进度与阶段拆成两个 context（工作台只订阅引用恒定的动作，避免 30 MB 下载时被进度事件反复重渲染） |
| `src/features/startup/StartupCover.tsx` + `startup.css` | 完整封面：真实字节进度、就绪后出「进入探索」、45 s 超时提示与「重新加载」、就绪后焦点落到按钮 |
| `src/services/anatomyModel.ts` | 模型地址（**不依赖 three**，避免首页把三维运行时拉进主包）；默认使用随包发布的本地文件，`VITE_BODYDAY_ATLAS_URL` 可指向同版本镜像 |
| `src/three/FullBodyStage.tsx`（产品级重写） | 自建舞台：位移、可见性、外壳淡化、材质自发光高亮、相机取景、真实点选归一、`onReady` / `onProgress` / `onProbe` 三路真实上报 |
| `public/models/z-anatomy-1.4.0-full-body.glb` | 整具人体资产（31,849,556 字节），随作品发布 |
| `public/models/ANATOMY_LICENSE.txt` | CC BY-SA 4.0 的署名、修改说明与相同方式共享条款 |

**重写 / 收敛**

| 文件 | 变化 |
| --- | --- |
| `src/features/workbench/ExploreWorkbench.tsx` | 删除左栏与引导模式；改为模型驱动的点选 + 层级栈 + 拆解控制 + 器官/系统/细胞派生 |
| `src/features/workbench/KnowledgePaper.tsx` | 收敛为「当前选中 / 本页主体 / 关系 / 跨尺度 / 科学边界」，来源编号与许可长文移入「关于」 |
| `src/services/atlas.ts` | 从「atlas 目录加载 + 按系统懒加载」收敛为纯映射模块（结构 ID ↔ 领域实体、系统中文名、已登记结构中文名） |
| `src/three/fullBody.ts` | 新增解剖分层位移、外壳不透明度曲线、结构归并与可读名规则、点选归一（均为纯函数，24 项单测覆盖） |
| `src/app/AppShell.tsx` | 顶栏收敛为「BodyDay + 关于」；封面期间整个外壳 `inert` |
| `src/features/about/AboutPage.tsx` | 更新模型来源 / 许可 / 修改说明、拆解的科学边界声明、页面索引口径 |
| `src/app/routes.ts` | 11 页口径与描述按 V2 更新 |

**删除**（旧实现可从 Git 历史回退）

`src/three/AtlasStage.tsx`、`src/three/atlasSelection.ts`、`src/features/workbench/StructureRail.tsx`、`WelcomeOverlay.tsx`、`GuidePanel.tsx`、`src/components/QuizBlock.tsx`、临时技术验证页 `/spike-full-body`；并移除 `@vixotic/vanatome-react` / `-atlas` 的所有代码引用。

**保留**

`domain/`（16 实体 / 14 关系 / 11 系统 / 19 来源 / **3 套科普脚本共 29 步 + 6 道带来源的检验题，作为内容资产保留**）、`CellStage` / `ModelStage` / `NeuronModel` / `LeukocyteModel` / `cellGeometry`（19 项单测）、`design/`（暖白 `#f7f5f1`、墨 `#1a1917`、直角 `--bd-radius: 0`、缓动 `cubic-bezier(0.16,1,0.3,1)`）。

---

## 4. 怎么运行与验证

```bash
cd body-day
npm ci                 # 安装依赖
npm run dev            # http://localhost:5173
npm run build          # tsc -b + vite build
npm run test           # vitest：65 项
npm run lint           # oxlint
```

- 模型在 `body-day/public/models/`，`vite` 会自动以 `/models/...` 提供；**断网也能运行**。
- 若要改用镜像：`VITE_BODYDAY_ATLAS_URL=https://<mirror> npm run dev`（须为同一 1.4.0 版本）。
- 首页 `/` 走封面闸门；逐页评审可直接深链 `/body`、`/systems/*`、`/organ/*`、`/cell/*`、`/about`。
- 界面内的隐藏入口：在人体总览点器官 → 右纸条出现「进入心脏（单独观察）」；大脑页 → 「进入神经元」；脾脏页 → 「查看白细胞」。

---

## 5. 已知风险与后续建议

| 项 | 现状 | 建议 |
| --- | --- | --- |
| 真实 GPU 性能 | 未采集（自动化跑 SwiftShader） | 在目标机型上用同一脚本采集帧率；若低端机掉帧，可先降低 `Canvas` 的 `dpr` 上限（当前 `[1, 1.5]`） |
| 移动端 | 仅视口检查（390×844），未真机 | 真机截图验收；必要时把右纸条抽屉改成手势驱动 |
| 拆解层间距 | 每层额外位移 = 人体半径 × 0.17 | 若评审希望「更散开」，提高 `EXPLOSION_LAYER_STEP_RATIO`（同时观察取景是否仍包得住）|
| 平台提交 | 未提交（截止 2026-10-18） | 按平台要求组织交付包（源码包 + 开发文档 + 截图 + 视频）|
| 器官覆盖 | 只有脑 / 心 / 脾有专题页 | 扩展更多器官需先有真实关系与来源支撑，不为「覆盖数量」编内容 |

---

## 6. 诚实声明

1. 需求四（人体拆解）按「机制已验证、产品级分离仍在打磨」口径记录，不称其已完成到「所有结构任意拆解」的程度。
2. 未测项（真实 GPU 帧率、移动端真机）一律标注为未测，不写成已完成。
3. 作品**尚未在平台提交**；《作品开发文档》的排版需要在 Word / WPS 中人工确认一次。
4. 模型为 Z-Anatomy（CC BY-SA 4.0）；本作品对模型的改动（分组位移、外壳隐去、系统过滤、暖调配色）已在 `public/models/ANATOMY_LICENSE.txt` 与 `/about` 页标明，并按相同方式共享。
