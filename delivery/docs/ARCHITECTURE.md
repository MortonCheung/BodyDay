# BodyDay · 架构说明（ARCHITECTURE）

> 本版为 **V2 口径**：产品形态是「以中央唯一真实三维人体为入口的空间工作台」，
> 人体模型随作品发布（本地加载），人体 / 器官层由本作品自建的 React Three Fiber 舞台渲染。

## 1. 技术栈

React 19 + TypeScript + Vite 8 + Three.js r186 / React Three Fiber 9 / Drei 10，
单页应用，路由使用 `react-router-dom` 的 **HashRouter**。

选择 HashRouter 的原因：作品以「网址链接」形式提交，可能部署在任何静态托管上。
Hash 路由不依赖服务端重写规则，**刷新、直接粘贴带 # 的链接、浏览器前进/后退都能正确恢复视图**。

## 2. 产品形态：一个空间工作台 + 启动封面闸门

BodyDay 不是一组并列页面，而是**一个空间工作台（single spatial workbench）**：

- 中央永远是**同一具真实三维人体**（本作品自建的 R3F 舞台 `FullBodyStage` 渲染，
  直接加载随包发布的 Z-Anatomy 整具人体 GLB）；
- **右侧一条知识纸条** `KnowledgePaper`，随「当前选中」联动（当前选中 / 本页主体 /
  与其它结构的关系 / 跨尺度 / 科学边界）；**没有左侧结构目录**；
- 结构的选择完全交给模型本身：点选、悬停高亮、聚焦、隔离、逐层拆解，
  以及「返回上一级」的层级栈；点模型空白处或按 **Esc** → 取消选中并回到本页默认取景；
- 人体 → 系统 → 器官 → 细胞之间的差别，只体现为**镜头位置与右纸条内容的变化**，
  不换页面外壳、不重挂三维场景。

首页 `/` 先出**完整独立的启动封面闸门** `StartupCover`（暖白，与主界面同一视觉语言）：

- 封面内显示模型**真实字节进度**（整具人体 GLB 31,849,556 字节 ≈ 31.8 MB）；
- 舞台上报「装配完成 + 首个有效帧」（`onReady`）后才出现「进入探索」按钮；
- **不自动进入、不自动淡出**；进入前整个外壳处于 `inert` 且不可读屏；
- 加载超过 45 s 提示检查网络并给出「重新加载」；
- 状态机 `loading → ready-to-enter → entering → exploring`（见 `AppProviders`）。
- 深链 `/body`、`/organ/*`、`/cell/*`、`/about` **不经过封面**。

## 3. 分层结构

```
src/
  app/
    resolveView.ts       把 URL 解析成工作台视图（body/system/organ/cell/about）
    AppShell.tsx         稳定外壳：品牌 / 「关于」 + 应用级错误边界；封面期间整体 inert
                         所有探索页都只渲染同一个 <ExploreWorkbench view={view}/>
    AppRouter.tsx        入口（HashRouter + AppProviders + AppShell）
    AppProviders.tsx     启动闸门状态机（loading → ready-to-enter → entering → exploring）；
                         进度与阶段拆成两个 context，避免 30 MB 下载时反复重渲染
    routes.ts            ROUTES + PAGE_INDEX（11 页可核查索引）
  domain/                纯数据层，无任何 React / Three 依赖
    types.ts             实体 / 关系 / 内容资产脚本 / 来源 的类型契约
    sources.ts           来源表（19 条，含可达性校验日期）与尺度定义
    entities.ts          实体表（人体 / 系统 / 器官 / 细胞 / 细胞结构）
    systems.ts           11 个解剖系统的定位与专题开关
    relations.ts         科学关系表（关系类型语义化）
    lessons.ts           3 套跨尺度科普脚本（29 步 + 6 道带来源检验题，作为内容资产保留）
    domain.test.ts       领域数据完整性测试（22 项）
  services/
    anatomyModel.ts      模型地址（不依赖 three，避免首页把三维运行时拉进主包）；
                         默认使用随包发布的本地文件，VITE_BODYDAY_ATLAS_URL 可指向同版本镜像
    atlas.ts             纯映射模块（结构 ID ↔ 领域实体、系统中文名、已登记结构中文名）
    organAssets.ts       区域说明文本、署名文本
    progress.ts          localStorage 学习记录（可一键清空）
  design/                设计令牌、排版、版面、组件与舞台样式、动效令牌
  three/
    lazyStages.ts        FullBodyStage / CellStage 的按需加载入口
    FullBodyStage.tsx    自建人体舞台：位移、可见性、外壳淡化、材质自发光高亮、
                         相机取景、真实点选归一，onReady / onProgress / onProbe 三路真实上报
    fullBody.ts          解剖分层位移、外壳不透明度曲线、结构归并与可读名规则、点选归一（纯函数）
    fullBody.test.ts     拆解位移与外壳不透明度的纯计算测试（24 项）
    ModelStage.tsx       细胞层的 Canvas 舞台 + 投影式热点层
    CellStage.tsx        细胞层舞台装配
    cellGeometry.ts      程序化神经元 / 白细胞几何 + 取景归一化（纯计算，可单测）
    NeuronModel.tsx      神经元 R3F 组件
    LeukocyteModel.tsx   白细胞 R3F 组件
    useStageState.ts     选中 / 悬停 / 聚焦 / 复位 / 转动 的统一状态
  components/            共享 UI、错误边界（ErrorBoundary）、舞台降级边界（StageBoundary）
  features/
    workbench/           空间工作台（ExploreWorkbench / KnowledgePaper / paperChrome）
    startup/             启动封面闸门（StartupCover + startup.css）
    about/               封底阅读页面（AboutPage）
  legacy/dorm/           旧「寝室 3D Demo」（归档保留，不在新应用入口中）
```

> **V2 已删除的 V1 结构**（保留在 Git 历史中，可回退）：
> `three/AtlasStage.tsx`、`three/atlasSelection.ts`、`features/workbench/StructureRail.tsx`、
> `WelcomeOverlay.tsx`、`GuidePanel.tsx`、`components/QuizBlock.tsx`，以及临时技术验证页 `/spike-full-body`；
> 并移除 `@vixotic/vanatome-react` / `-atlas` 的所有代码引用。

## 4. 关键工程决策

### 4.1 路由不拆分组件树

`resolveView.ts` 把 URL 解析成一个视图对象（`kind` + `systemId`/`organId`/`cellId`），
`AppShell` 只用**同一个** `<ExploreWorkbench view={view}/>` 渲染所有探索页面，不使用 `<Routes>` 声明多条路由。
原因：若每个页面各自声明一条 Route，路由切换时 React 会卸载并重新挂载舞台，
造成「地图先归位、再重新聚焦」式的画面跳动，也会重复加载模型。
统一解析路径 → **同一棵组件树只更新 props**，三维场景在整段探索中始终挂载。

人体 `/body`、系统 `/systems/:id`、器官 `/organ/:id`、细胞 `/cell/:id` 之间的切换，
因此都不会重新加载三维场景；只有 `/about` 是不同的阅读页面（`canvas = 0`）。
首页 `/` 由启动封面闸门接管（进入前不揭示内部）。

### 4.2 三维运行时按需加载 + 模型随包发布

`three` + R3F + Drei 被打进独立分块（`OrbitControls-*.js`，约 **246 kB gzip**），
仅当真正进入人体 / 细胞层时才由 `React.lazy` 拉取。实测构建产物：

| 产物 | 原始 | gzip |
|---|---|---|
| `index-*.js`（首屏，含探索页外壳） | 337.89 kB | 107.55 kB |
| `OrbitControls-*.js`（三维运行时） | 928.08 kB | 246.00 kB |
| `FullBodyStage-*.js`（按需加载） | 82.68 kB | — |
| `CellStage-*.js`（按需加载） | 11.16 kB | — |

因此封底 `/about` 的首屏**不承担三维体积**（`canvas = 0`）。

整具人体 GLB 随作品发布在 `public/models/z-anatomy-1.4.0-full-body.glb`（31,849,556 字节），
运行时**不再依赖外链 CDN**；本地就绪实测 0.61–1.24 s，断网 / 离线也能运行。
`VITE_BODYDAY_ATLAS_URL` 可指向同版本（1.4.0）镜像。

### 4.3 自建舞台与真实拆解（需求四）

第三方查看器封装 `@vixotic/vanatome-react` 的公开 API 只提供
select / focus / isolate / reset / visibleLayers，**没有网格位移入口**，
无法实现真实拆解；V2 因此从渲染路径移除它，改由自建舞台 `FullBodyStage` 直接加载整具人体 GLB。

- 读取 GLB 的 `extras`（`anatomyId` / `anatomyParentId` / `anatomySystem`）建立结构索引与父子关系；
- 按可位移结构组对**真实网格位置**做径向平移，并按解剖系统分层
  （regional-anatomy=0、muscular=1、skeletal=2、cardiovascular/lymphatic/respiratory/digestive/urinary=3、
  nervous/endocrine/reproductive=4，每层额外位移 = 人体包围球半径 × 0.17）；
- 体表外壳 `body-shell`（236 网格）在进度 0→0.4 渐进隐去，≥0.4 后不可见并被移出第 0 层（射线层）；
- 位移由 `progress` 重新计算并覆盖（**从不累加**，0→1→0→1 可复现）；
- 相机随**位移后的整体包围盒**联动取景（实测 3.05 → 3.25），完全拆解时人体整体仍在画面内。

实测可见网格数 984 → 748，且**拆解后仍可点选**（按投影坐标 50% 一次命中心脏、100% 一次命中脾脏）。

### 4.4 相机取景

- atlas 元数据里的 `position` 只是**兜底锚点，并不在渲染坐标系中**；
  早期用它在外部推算机位会把相机放进网格内部，导致画面全黑。
- 现在的做法是「**选中并请求聚焦**目标结构」，由舞台遍历真实网格算包围盒来决定机位。
- 各尺度的入场取景结构：
  - 全身：`body-shell`（区域解剖中唯一覆盖整具人体的结构，含 236 个网格）；
  - 系统：该系统的**根结构**（`kind === 'system'`，如 `nervous-system`），运行时从已加载清单中取；
  - 器官：`cerebrum` / `heart` / `spleen`。

### 4.5 结构归并与可读名规则

模型中有大量未登记中文名的细分结构，界面不作全量罗列：

- 同一个器官下的细分结构归并成该器官一项；
- 能映射到 BodyDay 实体的结构显示**中文名**，其余显示真实的解剖**英文名**（属科学术语，可以展示）；
- **内部 ID（如 `body-shell`）一律不展示**给用户；
- 更细的结构可直接在三维模型上点选，点选后右纸条给出真实结构名（同样不泄漏内部 ID）。

这条规则同时满足两个约束：界面不出现工程术语与字段名；**不编造中文译名**。

### 4.6 CPU 与内存安全：错误边界 + 降级

- **应用级错误边界**：任一视图渲染异常只影响该视图，显示「重试 / 回到首页」。
- **舞台级降级边界** `StageBoundary`：覆盖三类真实故障 ——
  浏览器不支持 WebGL、上下文丢失、模型加载 / 解码异常。
  发生时舞台内显示明确说明与「重新初始化」入口，
  **页面其余部分（知识卡、导航）保持可用，不白屏**。
- WebGL 能力探测每次会话只做一次，并主动 `loseContext()` 释放探测上下文，
  避免占用浏览器有限的上下文配额。
- 模型加载失败时给出真实错误与重试入口，可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本自建镜像。

## 5. 状态与生命周期

- **启动闸门状态**：`loading → ready-to-enter → entering → exploring`（`AppProviders`）；
  进度与阶段拆成两个 context，工作台只订阅引用恒定的动作，避免 30 MB 下载时被进度事件反复重渲染。
- **导航状态**：当前视图（由 `resolveView` 派生）、当前尺度、选中实体 / 结构、拆解进度。
  学习进度写入 localStorage（`bodyday.discovered.v1` / `bodyday.prefs.v1`），可一键清空。
- **选中是唯一的状态源**：模型点选、跨尺度跳转都写回同一份选中，
  右纸条据此派生「当前选中 / 本页主体 / 与其它结构的关系 / 跨尺度 / 科学边界」五类内容。
- **资源生命周期**：模型为随包发布的本地文件；探索页共用同一个工作台实例，切换页面**不会**卸载舞台。
- **相机**：`FullBodyStage` 只接收「聚焦某结构 / 复位 / 拆解进度」的意图，
  机位由舞台按真实包围盒计算；`prefers-reduced-motion` 时关闭过渡动画。

## 6. 动效语义

与设计基线一致，只保留五类有解释力的动画：

| 类型 | 回答的问题 | 落点 |
|---|---|---|
| Hover | 这个元素可以被操作吗？ | 细线加宽、抬升（可中断、只发生一次） |
| Selection | 当前选中的是哪一个？ | 三维结构材质自发光高亮 |
| Route | 我是「进入」还是「返回」？ | 右侧纸条的纸张式揭起（`clipPath`），不动中央舞台 |
| Camera | 我在空间中的哪里移动到哪里？ | 结构聚焦、器官取景、拆解后的包围盒联动 |
| Scale | 换了尺度吗？ | 右侧纸条上的**跨尺度指示**（人体 / 系统 / 器官 / 细胞），**由镜头运动本身表达尺度变化** |

`prefers-reduced-motion: reduce` 时全部降级为**瞬时**，而不是换一段更短的动画。

## 7. 已知限制（如实记录）

1. 三维模型为科普示意：器官不按真实比例；取景按真实网格包围盒计算，
   全身 / 系统 / 器官的入场结构是**有意选定**的锚点，不是几何精确的解剖配准。
2. **拆解的产品级视觉分离仍在打磨**：分层位移与外壳渐进隐去已落地并实测可见，
   但内部层间距仍可继续加大（当前每层额外位移 = 人体包围盒半径 × 0.17）。
3. 细胞模型为程序化概括形态，不代表真实细胞形态学，也不按真实比例；细胞几何为本作品原创。
4. **真实 GPU 帧率未采集**（自动化验收跑在 SwiftShader 软件渲染下）；
   **移动端只在浏览器视口（390×844）下检查**，未在真机 / 模拟器验收。
