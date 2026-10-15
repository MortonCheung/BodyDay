# 00 · 基线勘察与技术可行性（BodyDay V2）

> 本文件只记录**实测**结果。所有数字均来自本地真实运行、真实依赖源码或真实远端资源。
> 记录时间：2026-10-15（本机时间）。比赛提交截止：2026-10-18。

---

## 1. Git 基线与工作纪律

| 项 | 实测值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git` |
| 基线分支 | `main`，HEAD = `aea1669f20e87a4cc6a7e6c9d9caf83e46129f5d`（与任务书写的一致） |
| 工作区 | 干净（`git status --short` 输出 0 行），无他人未提交改动 |
| V2 工作分支 | `feat/bodyday-immersive-v2`（从 `aea1669` 建立） |
| 纪律 | 小步提交；不 force push；不自动合并 main；不修改其它竞赛仓库；保留旧版本可回退能力 |

> `origin/main` 已包含 11 张页面截图（`docs/screenshots/01-cover.png` … `11-about.png`）。
> `body-day/docs/RELEASE_STATUS.md` 与 `delivery/RELEASE_STATUS.md` 目前仍写着「未提交、未推送、同步于 1da523a」，
> 与事实（`aea1669` 已推送、工作区干净）不符，属待修正项（见 §6）。

---

## 2. 现有工程事实（用于判断改动成本）

| 项 | 实测值 |
|---|---|
| 技术栈 | React 19.2.8 / TypeScript ~6.0.2 / Vite ^8.3.0 / three ^0.186.1 / @react-three/fiber ^9.8.1 / @react-three/drei ^10.7.9 / react-router-dom ^7.18.4 |
| 三维依赖 | `@vixotic/vanatome-react` **0.1.6**（MIT，已安装版本与任务书一致）、`@vixotic/vanatome-atlas` **0.1.4**（MIT） |
| 现有测试 | vitest 2 个文件 41 项：`src/domain/domain.test.ts` 22 项、`src/three/cellGeometry.test.ts` 19 项 |
| 内容资产（不得因换引擎而丢失） | 科学实体 16 条、科学关系 14 条、来源 19 条；原创细胞模型 `NeuronModel` / `LeukocyteModel` |
| 当前页面口径 | 11 个可直达页面（`/`、`/body`、3 个系统、3 个器官、2 个细胞、`/about`） |
| 现有三维结构 | `AtlasStage`（VanatomeViewer，人体/系统/器官）+ `CellStage`（自研 R3F 程序化细胞）→ **两个独立 Canvas** |

### 2.1 当前 UI 现状（逐条取证，对应 V2 任务书 §2.1）

| 任务书指出的问题 | 取证 | 结论 |
|---|---|---|
| 打开即看到模型加载过程 | `AtlasStage` 在 `hasModel === false` 时渲染加载态 | 属实 |
| 欢迎层自动消失、无进入操作 | `WelcomeOverlay`：`HOLD_AFTER_READY = 2400`、`HOLD_MAX = 9000`，无按钮 | 属实 |
| 左右/左栏信息过多、模型不是视觉中心 | 三栏布局 `--bd-wb-left/right`，中央舞台被两侧纸条压缩 | 属实 |
| 左侧结构目录不符合层级探索 | `StructureRail` 常驻 | 属实 |
| 右上角两种模式没必要 | `AppShell` 第 97 / 106 行「自由探索 / 引导教学」 | 属实 |
| 来源编号破坏沉浸感 | `KnowledgeCard` → `SourceList` 直接渲染 `S01…` | 属实 |
| 器官↔细胞靠按钮跳转 | `KnowledgePaper` 的「进入 X」链接 | 属实 |

### 2.2 任务书路径口径的偏差（需澄清，不擅自移动历史文档）

任务书 §1.1 要求读 `docs/ARCHITECTURE.md`、`docs/TEST_REPORT.md`，但这两个文件**不在仓库根 `docs/`** 下。
真实分布：

- `body-day/docs/`：ARCHITECTURE.md、TEST_REPORT.md、H5_PAGE_INDEX.md、DEMO_VIDEO_SCRIPT.md、RELEASE_STATUS.md、SOURCES.md
- `delivery/docs/`：ARCHITECTURE.md、SOURCES.md、作品开发文档.md / .docx
- 仓库根 `docs/`：BASELINE_AND_REFERENCES.md、FINAL_DELIVERY_REPORT.md、REFERENCE_ADOPTION.md、screenshots/、比赛附件 docx

**后续 V2 记录统一写入仓库根 `docs/v2/`**（本文件即在其中），不移动既有文档、不破坏现有相对路径。

---

## 3. Vanatome 0.1.6 的真实加载生命周期与能力边界

数据来源：`body-day/node_modules/@vixotic/vanatome-react/dist/*.js|*.d.ts`（逐行阅读，非推测）。

### 3.1 加载回调的真实语义

| 回调 | 真实触发点 | 说明 |
|---|---|---|
| `onLoadStart(modelUrl)` | `LoadStartMonitor` 挂载时，按模型逐个触发 | 单模型开始加载 |
| `onLoadProgress({loaded,total,percentage})` | 传给每个模型的 `Suspense` fallback（`LoadingMonitor.onProgress`） | **真实字节进度**，可直接用于百分比 |
| `onModelReady(modelUrl)` | `LoadedAtlasModel` 装配出模型时 | 单模型装配完成 |
| `onReady()` | `readyCount === composition.modelUrls.length` 时触发 | **当前请求的全部模型都已装配完成** |
| `onError({code,message,modelUrl})` | `ViewerErrorBoundary` / `ContextMonitor` | `code ∈ { model-load-failed, webgl-context-lost }` |

结论：任务书 §3.3 / §4.1 要求的「真实就绪判定」在本依赖上**可以实现**：
`onReady` 用来判定装配完成，再叠加一次 `requestAnimationFrame` 等待首个有效帧即可对外宣布可进入。
另外 `catalog.json` 每个 bundle 自带 `bytes` 字段 → 可算出**真实**总体积，无需伪造百分比。

### 3.2 能力边界（决定「拆解」能否在 Vanatome 之上实现）

包的全部对外导出（`index.d.ts`）：
`VanatomeViewer`、`composeVanatomeAtlases`、`resolveVanatomeAtlasSources`、`createVanatomeHierarchy`、`getVanatomeDescendantIds`、`getRelatedStructureIds`、`isStructureSelectable`、`resolveStructureVisibility`、`useVanatomeController`。

`VanatomeController` 的全部能力：
`selectedId / isolatedId / visibleLayers / focusRequestKey / resetViewKey / select() / focus() / isolate() / reset() / setVisibleLayers() / toggleLayer()`。

**没有任何导出能访问内部场景图、网格对象或部件位移。**
`displayMode ∈ {normal,xray,ghost}`、`hiddenIds`、`appearance`（各类不透明度与自发光强度）只能改**显隐与外观**，不能移动几何。

⇒ **在 Vanatome 之上加"拆解适配层"不可行**，除非 fork 依赖源码（任务书 §6.2 明确禁止）。

---

## 4. 关键发现：atlas 自带「单文件整具人体」，且节点自带结构 ID

这是本次基线勘察最重要的发现，直接改变了拆解方案的成本结构。

### 4.1 catalog 的真实构成（`https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json`）

- `profiles` 只有**一个**：`{ id: "full-body", bundleId: "curated-full-body" }`，且 `defaultProfileId = "full-body"`。
  → **atlas 官方默认视图本来就是「一个文件里的整具人体」**。
- `curated-full-body`：`structureCount 807`、`nodeCount 984`、`bytes 31,849,556`（30.4 MB），
  `systems` 覆盖全部 11 个系统，`modelUrl = …/z-anatomy-1.4.0-full-body.glb`。
- 其余 11 个按系统拆分的 bundle 合计 **96,402,980 字节 ≈ 91.9 MB**。

### 4.2 整具人体 GLB 的实测结构（已下载 `fb.glb` 解析）

| 指标 | 实测值 |
|---|---|
| 文件体积 | 30.4 MB（二进制缓冲 29.2 MB，JSON 1.3 MB） |
| 节点 / 网格 / 图元 | 984 / 984 / 984 |
| 三角形 / 顶点 | **1,746,560 / 972,475** |
| 材质 | 64 个，命名规则为 `vanatome__<结构ID>`（如 `vanatome__body-shell`） |
| 带 `extras.anatomyId` 的节点 | **984 / 984** |
| 唯一 `anatomyId` | 749 |
| 带 `extras.anatomyParentId` | 748 / 984 |
| 带 `translation`（可位移）的节点 | **968 / 984** |
| 节点命名 | `<结构ID>__<解剖英文名>`（如 `…__Anterior axillary nodes.l`）→ 可读英文名可直接用作提示 |
| 按系统的节点数 | regional-anatomy 236（体表）、nervous 234、skeletal 181、muscular 170、cardiovascular 64、lymphatic 54、reproductive 14、digestive 12、endocrine 10、respiratory 6、urinary 3 |
| 附带资产 | 场景 extras 内含 Z-Anatomy 自带相机预设（HEAD/NECK/CHEST/HIPS/ARM/LEG/HOME…），可作取景参考 |

其中 `spleen` 有独立网格；`heart`、`cerebrum` 在 metadata 中是 `objectCount = 0` 的**分组节点**，
几何挂在它们的后代上（由 `extras.anatomyParentId` 可归并）——与现有 `buildStructureEntityIndex` 的处理方式一致。

### 4.3 atlas 元数据不带科普文本（已实测）

`full-body.metadata.json` 的 807 个结构中，`summary` / `function` / `fact` 字段**全部为空**
（nervous 249 条、lymphatic 56 条抽查同样为 0）。
⇒ 科普正文只能继续使用 BodyDay 自建的 16 实体 / 14 关系 / 19 来源，**换引擎不能也不应清空这些内容**。

---

## 5. 拆解方案选型（结论见 `03_EXPLOSION_FEASIBILITY.md`）

两条候选路线的**实测**成本对比：

| 维度 | 首选：Human Atlas | 备选：atlas 自有整具人体 + 自建 R3F 舞台 |
|---|---|---|
| 实测仓库体积 | 154 MB（`public/` 90 MB） | 无需新增仓库体积（运行时按需加载 30.4 MB） |
| three 版本 | **^0.159.0**（本工程 ^0.186.1） | 与本工程一致（^0.186.1） |
| 是否用 R3F | **否**（命令式 three.js） | 是（与现有 `ModelStage` 同范式） |
| 数据来源 | BodyParts3D 4.0 / CC BY 4.0（**新增许可义务**） | Z-Anatomy / CC BY-SA 4.0（**已在「关于」署名**） |
| ID 体系 | 需手工建立 → BodyDay 实体的映射 | 已有 `buildStructureEntityIndex` 等现成映射 |
| 可位移节点 | 合批几何 + GPU 状态纹理（**无独立网格对象**） | 968 / 984 节点带 `translation`，逐节点可位移 |
| 几何规模 | 约 2,288,268 三角形（其 README 声明） | **1,746,560 三角形**（实测，少 23%） |
| 与 §2.2「不长期同时加载两套人体引擎」 | 违反 | 满足 |

⇒ 选型：**采用备选方案**，即用 atlas 自有的 `curated-full-body` bundle，在 R3F 中自建拆解舞台。
首选受阻的完整证据见 `03_EXPLOSION_FEASIBILITY.md`；这不是"没有尝试"，而是实测后按任务书 §2.4 的允许路径切换。

---

## 6. 待修正的交付缺口（已核实，本轮修复）

| 缺口 | 实测证据 | 处置 |
|---|---|---|
| 《作品开发文档》.docx 未入库 | 根 `.gitignore` 含 `*.doc` / `*.docx`；`git ls-files` 与 `git ls-tree -r origin/main` 中均无任何 docx | 精确放行 `!delivery/docs/作品开发文档.docx`（附件 docx 继续忽略） |
| 状态报告过期 | `body-day/docs/RELEASE_STATUS.md` 与 `delivery/RELEASE_STATUS.md` 仍写「未提交、未推送」 | 更正为真实提交/推送状态 |
| 源码包与交付包混淆 | `delivery/source-archive.zip` 有意只含 `source/`（134 项，无 docx / 无 png） | 明确区分两种包，见 `05` / 交付说明 |
| 移动端与真实 GPU 性能未测 | 本机只能以 headless + SwiftShader 软件渲染验收 | 报告中标注「移动视口已验证、真机未验证」「软件渲染，未采集真实 GPU 帧率」 |

---

## 7. 尚未确定的事项（施工中继续核实）

1. `curated-full-body` 在 984 个网格、单一 Canvas 下的**真实桌面帧率**（本机软件渲染无法代表）。
2. 拆解布局的位移方向与幅度定标：本作品将按**真实几何包围盒 + 人体纵轴中心**计算径向方向，
   不使用随机向量，也不照搬 Human Atlas 的清单式排布（任务书 §3.3 明确要求保持人体轮廓可辨认）。
3. H5 页面计数口径：删除导航后仍保留可直达路由与真实内容，合规区间为 10～20 页，
   最终页数以实际可核查路径为准并在交付文档中写明。
