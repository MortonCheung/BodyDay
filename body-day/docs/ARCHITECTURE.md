# BodyDay · 架构说明（ARCHITECTURE）

## 1. 技术栈

React 19 + TypeScript + Vite 8 + Three.js 0.186 / React Three Fiber 9 / Drei 10，
单页应用，路由使用 `react-router-dom` 的 **HashRouter**。

选择 HashRouter 的原因：作品以「网址链接」形式提交，可能部署在任何静态托管上。
Hash 路由不依赖服务端重写规则，**刷新、直接粘贴带 # 的链接、浏览器前进/后退都能正确恢复视图**。

## 2. 产品形态：一个空间工作台

BodyDay 不是一组并列页面，而是**一个空间工作台（single spatial workbench）**：

- 中央永远是**同一具三维人体**（Vanatome / Z-Anatomy atlas，经 `@vixotic/vanatome-react` 渲染）；
- 左纸条 = 解剖系统目录 + 当前图层可聚焦的**真实结构清单**；
- 右纸条 = 随「当前选中」联动的知识内容（结构知识卡、与健康的关系、与其它结构的关系、
  跨尺度导航、来源链接、秒级时钟、尺度轴指示）；
- 点中间模型上的结构 → 右纸条内容随之变化；点模型空白处或按 **Esc** → 取消选中并回到本页默认取景；
- 人体 → 系统 → 器官 → 细胞之间的差别，只体现为**镜头位置与两侧面板内容的变化**，
  不换页面外壳、不重挂三维场景。

封面页 `/` 就是**同一个工作台 + 一层欢迎语文字覆盖层**：第一帧即真实三维场景，
欢迎语只是盖在上面的文字，约 2.4 秒后自然淡出（冷启动时最迟 9 秒），**没有「开始 / 跳过」按钮**。

「引导教学」不再是独立课程页，而是在**同一张右纸条顶部插入一条步骤引导**：
步骤会把镜头带到真实结构上，需要时内嵌一道检验题。它完全复用自由探索那一套模型、纸条与左栏。

## 3. 分层结构

```
src/
  app/
    resolveView.ts       把 URL 解析成工作台视图（cover/body/system/organ/cell/about）
    AppShell.tsx         稳定外壳：品牌 / 主导航 / 模式开关 + 应用级错误边界
                         所有探索页都只渲染同一个 <ExploreWorkbench view={view}/>
    AppRouter.tsx        入口（HashRouter + AppProviders + AppShell）
    AppProviders.tsx     双模式上下文（自由探索 / 引导教学）
    routes.ts            ROUTES + PAGE_INDEX（11 页可核查索引）
  domain/                纯数据层，无任何 React / Three 依赖
    types.ts             实体 / 关系 / 引导脚本 / 来源 的类型契约
    sources.ts           来源表（19 条，含可达性校验日期）与尺度定义
    entities.ts          实体表（人体 / 系统 / 器官 / 细胞 / 细胞结构）
    systems.ts           11 个解剖系统的定位与专题开关
    relations.ts         科学关系表（关系类型语义化）
    lessons.ts           3 套引导教学脚本（步骤 + 检验题 + 来源）
    *.test.ts            领域数据完整性测试（22 项）
  services/
    atlas.ts             atlas 加载（按系统懒加载）、结构 ID ↔ 实体映射
    organAssets.ts       区域说明文本、署名文本
    progress.ts          localStorage 学习记录（可一键清空）
  design/                设计令牌、排版、版面、组件样式、舞台样式、动效令牌
  three/
    lazyStages.ts        AtlasStage / CellStage 的按需加载入口
    AtlasStage.tsx       人体 / 系统 / 器官层舞台（唯一的人体三维渲染入口）
    ModelStage.tsx       细胞层的 Canvas 舞台 + 投影式热点层
    cellGeometry.ts      程序化神经元 / 白细胞几何 + 取景归一化（纯计算，可单测）
    NeuronModel.tsx      神经元 R3F 组件
    LeukocyteModel.tsx   白细胞 R3F 组件
    CellStage.tsx        细胞层舞台装配
    useStageState.ts     选中 / 悬停 / 聚焦 / 复位 / 转动 的统一状态
    atlasSelection.ts    受控选中 Hook（与 three 解耦，便于按需加载）
  components/            共享 UI：知识卡、来源列表、检验题、错误边界、舞台降级边界
  features/
    workbench/           空间工作台（ExploreWorkbench / StructureRail / KnowledgePaper /
                         GuidePanel / WelcomeOverlay / paperChrome）
    about/              封底阅读页面（AboutPage）
  legacy/dorm/           旧「寝室 3D Demo」（归档保留，不在新应用入口中）
```

> 已删除的历史结构：全屏「尺度遮罩」`ScaleVeil`、独立「使用向导」页、3 个独立课程页、
> 「科学关系图」页与「学习总结」页。它们的职责已分别并入工作台的右纸条尺度轴、
> 右纸条的步骤引导、右纸条的「与其它结构的关系」区块与结构选中反馈。

## 4. 关键工程决策

### 4.1 路由不拆分组件树

`resolveView.ts` 把 URL 解析成一个视图对象（`kind` + `systemId`/`organId`/`cellId`），
`AppShell` 只用**同一个** `<ExploreWorkbench view={view}/>` 渲染所有探索页面，不使用 `<Routes>` 声明多条路由。
原因：若每个页面各自声明一条 Route，路由切换时 React 会卸载并重新挂载舞台，
造成「地图先归位、再重新聚焦」式的画面跳动，也会重复加载模型。
统一解析路径 → **同一棵组件树只更新 props**，三维场景在整段探索中始终挂载。

覆盖页 `/`、人体 `/body`、系统 `/systems/:id`、器官 `/organ/:id`、细胞 `/cell/:id` 之间的切换，
因此都不会重新加载三维场景；只有 `/about` 是不同的阅读页面（`canvas = 0`）。

### 4.2 三维运行时按需加载

`three` + R3F + Drei 被打进独立分块（`OrbitControls-*.js`，约 **246 KB gzip**），
仅当进入三维页面时才由 `React.lazy` 拉取。实测构建产物：

| 产物 | 原始 | gzip |
|---|---|---|
| `index-*.js`（首屏，含探索页外壳） | 350.71 KB | 111.38 KB |
| `index-*.css` | 30.56 KB | 6.30 KB |
| `OrbitControls-*.js`（三维运行时） | 928.13 KB | 246.43 KB |
| `AtlasStage-*.js` | 91.24 KB | 27.91 KB |
| `CellStage-*.js` | 11.16 KB | 4.09 KB |

因此封底 `/about` 的首屏**不承担三维体积**。

### 4.3 相机取景完全交给查看器

- atlas 元数据里的 `position` 只是查看器的**兜底锚点，并不在渲染坐标系中**；
  早期用它在外部推算机位会把相机放进网格内部，导致画面全黑。
- 现在的做法是「**选中并请求聚焦**目标结构」，由查看器遍历真实网格算包围盒来决定机位，
  因此镜头总是落在正确的结构上。
- 各尺度的入场取景结构：
  - 全身：`body-shell`（区域解剖中唯一覆盖整具人体的结构，含 236 个网格）；
  - 系统：该系统的**根结构**（`kind === 'system'`，如 `nervous-system`），运行时从已加载清单中取；
  - 器官：`cerebrum` / `heart` / `spleen`。
- 所有聚焦 / 选中操作都先确认该 ID 在 atlas 元数据中命中，禁止写死猜测 ID；
  自动化测试对 `atlasStructureId` 做白名单校验（见 `domain.test.ts`）。

### 4.4 左栏结构清单的「折叠」规则

左栏是一份**可读的中文索引**，而不是几百条英文解剖术语的清单：

- 同一个器官下的细分结构归并成该器官一项（例如脑区之下 200 多个细分结构折叠为「大脑」一项）；
- 能映射到 BodyDay 实体的结构显示**中文名**，其余显示真实的解剖**英文名**（属科学术语，可以展示）；
- **内部 ID（如 `body-shell`）一律不展示**给用户；
- 更细的结构可直接在三维模型上点选，点选后右栏会给出现真实结构名（同样不泄漏内部 ID）。

这条规则同时满足两个约束：界面不出现工程术语与字段名；**不编造中文译名**——
没有登记过中文名的结构宁可显示它的真实英文名。

### 4.5 CPU 与内存安全：错误边界 + 降级

- **应用级错误边界**：任一视图渲染异常只影响该视图，显示「重试 / 回到首页」。
- **舞台级降级边界** `StageBoundary`：覆盖三类真实故障 ——
  浏览器不支持 WebGL、上下文丢失、模型加载 / 解码异常。
  发生时舞台内显示明确说明与「重新初始化」入口，
  **页面其余部分（结构清单、知识卡、来源、导航）保持可用，不白屏**。
- WebGL 能力探测每次会话只做一次，并主动 `loseContext()` 释放探测上下文，
  避免占用浏览器有限的上下文配额。
- 切换系统时会重新加载对应 atlas bundle；**已装配过模型时保持查看器挂载**，
  只在画面上给一条「正在切换解剖图层」的提示，避免画面跳回再重新聚焦。
  加载失败时给出真实错误与重试入口，可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本自建镜像。

## 5. 状态与生命周期

- **导航状态**：当前视图（由 `resolveView` 派生）、当前尺度、选中实体 / 结构、
  左栏当前图层、引导教学步骤。学习进度写入 localStorage
  （`bodyday.discovered.v1` / `bodyday.prefs.v1`），可一键清空；不为轻量学习记录新建后端。
- **选中是唯一的状态源**：模型点选、左栏点选、跨尺度跳转都写回同一份选中，
  右纸条据此派生「当前选中 / 本页主体 / 与其它结构的关系 / 跨尺度导航」四类内容。
- **资源生命周期**：模型按解剖系统懒加载；组件卸载或依赖变化时用 `AbortController`
  中止过期请求。因为探索页共用同一个工作台实例，切换页面**不会**卸载舞台。
- **相机**：`VanatomeViewer` 使用其自带平滑相机；
  `ExploreWorkbench` 只发出「聚焦某结构 / 复位」的意图（`focusNonce` / `resetNonce`），机位由查看器计算。
  `prefers-reduced-motion` 时关闭过渡动画。

## 6. 动效语义

与设计基线一致，只保留五类有解释力的动画：

| 类型 | 回答的问题 | 落点 |
|---|---|---|
| Hover | 这个元素可以被操作吗？ | 细线加宽、抬升（可中断、只发生一次） |
| Selection | 当前选中的是哪一个？ | 列表共享指示线滑动；三维结构高亮 |
| Route | 我是「进入」还是「返回」？ | 两侧纸条的纸张式揭起（`clipPath`），不动中央舞台 |
| Camera | 我在空间中的哪里移动到哪里？ | 结构聚焦、器官取景、尺度上/下移 |
| Scale | 换了尺度吗？ | 右纸条上一根低调的**尺度轴指示**（人体 / 系统 / 器官 / 细胞四层），**由镜头运动本身表达尺度变化** |

`prefers-reduced-motion: reduce` 时全部降级为**瞬时**，而不是换一段更短的动画。

## 7. 已知限制（如实记录）

1. 三维模型为科普示意：器官不按真实比例；取景由查看器按真实网格包围盒计算，
   全身 / 系统 / 器官的入场结构是**有意选定**的锚点，不是几何精确的解剖配准。
2. 细胞模型为程序化概括形态，不代表真实细胞形态学，也不按真实比例；细胞几何为本作品原创。
3. 人体层 atlas 资产从**官方 CDN**（`https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json`，
   实测 CORS 为 `*`）按需加载；**网络不稳定时偶发单次模型分片加载失败**，项目内置错误提示与重试，
   可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本自建镜像。
4. 左栏结构清单做了有意的「折叠」（见 §4.4），不是 atlas 结构的全量罗列。
