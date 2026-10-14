# BodyDay · 架构说明（ARCHITECTURE）

## 1. 技术栈

React 19 + TypeScript + Vite 8 + Three.js 0.186 / React Three Fiber 9 / Drei 10，
单页应用，路由使用 `react-router-dom` 的 **HashRouter**。

选择 HashRouter 的原因：作品以「网址链接」形式提交，可能部署在任何静态托管上。
Hash 路由不依赖服务端重写规则，**刷新、直接粘贴带 # 的链接、浏览器前进/后退都能正确恢复视图**。

## 2. 分层结构

```
src/
  app/
    AppRouter.tsx        路由表（HashRouter）
    AppShell.tsx         稳定外壳：品牌 / 模式切换 / 全局入口 + 应用级错误边界
    AppProviders.tsx     双模式上下文 + 跨尺度转场上下文
    ScaleVeil.tsx        尺度轴遮罩（换模型时的尺度交代）
    routes.ts            ROUTES + PAGE_INDEX（15 页可核查索引）
  domain/                纯数据层，无任何 React / Three 依赖
    types.ts             实体 / 关系 / 课程 / 来源 的类型契约
    sources.ts           来源表（含可达性校验日期）与尺度轴定义
    entities.ts          实体表（人体 / 系统 / 器官 / 细胞 / 细胞结构）
    systems.ts           11 个解剖系统的定位与专题开关
    relations.ts         科学关系表（关系类型语义化）
    lessons.ts           3 套引导课程（步骤 + 测验 + 来源）
    *.test.ts            领域数据完整性测试（22 项）
  services/
    atlas.ts             atlas 加载（按系统懒加载）、结构 ID 映射、子树范围与器官取景
    organAssets.ts       区域说明文本、组织层说明、署名文本
    progress.ts          localStorage 学习记录（可一键清空）
  design/                设计令牌、排版、版面、组件样式、舞台样式、动效令牌
  three/
    lazyStages.ts        AtlasStage / CellStage 的按需加载入口
    AtlasStage.tsx       人体 / 器官层舞台（唯一的人体三维渲染入口）
    ModelStage.tsx       器官 / 细胞层的通用 Canvas 舞台 + 投影式热点层
    cellGeometry.ts      程序化神经元 / 白细胞几何 + 取景归一化（纯计算，可单测）
    NeuronModel.tsx      神经元 R3F 组件
    LeukocyteModel.tsx   白细胞 R3F 组件
    CellStage.tsx        细胞层舞台装配
    useStageState.ts     选中 / 悬停 / 聚焦 / 复位 / 转动 的统一状态
    atlasSelection.ts    受控选中 Hook（与 three 解耦，便于按需加载）
  components/            共享 UI：页头、面包屑、知识卡、来源列表、测验、
                         错误边界、舞台降级边界、跨尺度跳转按钮
  features/              15 个页面（cover / guide / anatomy / organ / cell /
                         learning / relations / summary / about）
  legacy/dorm/           旧「寝室 3D Demo」（归档保留，不在新应用入口中）
```

## 3. 关键工程决策

### 3.1 路由级单活跃 WebGL 场景

- 人体层由 `VanatomeViewer` 自带 Canvas；器官 / 细胞层由本工程的 `ModelStage` 自带 Canvas。
- 两者**不做侵入式整合**（避免为了「单 Canvas 理想」改写第三方渲染器契约），
  而是由路由保证：**同一时刻只有一个活跃 WebGL 场景**，切换时旧场景被完整卸载。
- 实测结果：15 个页面中，三维页面的 `canvas` 数量均为 1，非三维页面为 0。

### 3.2 三维运行时按需加载

`three` + R3F + Drei 被打进独立分块（`OrbitControls-*.js`，约 **246 KB gzip**），
仅当进入三维页面时才由 `React.lazy` 拉取。实测构建产物：

| 产物 | 原始 | gzip |
|---|---|---|
| `index-*.js`（首屏不含三维） | 387 KB | 119 KB |
| `index-*.css` | 24 KB | 5 KB |
| `OrbitControls-*.js`（三维运行时） | 928 KB | 246 KB |
| `AtlasStage-*.js` | 90 KB | 28 KB |
| `CellStage-*.js` | 17 KB | 6 KB |

因此封面、向导、关系图、学习总结、关于这 5 页的首屏**不承担三维体积**。

### 3.3 结构 ID 必须真实存在

- 所有聚焦 / 选中操作都先确认该 ID 在 atlas 元数据中命中，禁止写死猜测 ID；
  自动化测试对 `atlasStructureId` 做白名单校验（见 `domain.test.ts`）。
- **实测发现并处理的两个真实约束**：
  1. atlas 中 `cerebrum`、`heart`、`cerebellum`、`brainstem` 是**分组节点**
     （`objectCount = 0`，自身无网格，几何全在子结构上）。直接对这些 ID 发起聚焦
     会被查看器以 `structure-has-no-visible-geometry` 拒绝。
  2. atlas 的 `position` 字段是查看器的**兜底聚焦锚点**，并不是真实几何包围盒。
- 因此器官层取景改为：遍历**子树中真正带几何的结构**，用它们的锚点估算范围
  （`structureSubtreeBounds`），再据此设置入场机位（`organCameraFrame`）。
  同时把查看器在装配后的「整体拟合」用一次主动复位抵消，保证镜头停在器官上。

### 3.4 CPU 与内存安全：错误边界 + 降级

- **应用级错误边界**：任一页面渲染异常只影响该页面，显示「重试 / 回到封面」。
- **舞台级降级边界** `StageBoundary`：覆盖三类真实故障 ——
  浏览器不支持 WebGL、上下文丢失、模型加载/解码异常。
  发生时舞台内显示明确说明与「重新初始化」入口，
  **页面其余部分（结构清单、知识卡、来源、导航）保持可用，不白屏**。
- WebGL 能力探测每次会话只做一次，并主动 `loseContext()` 释放探测上下文，
  避免占用浏览器有限的上下文配额。

### 3.5 已修复的严重缺陷（来自真实浏览器验收）

| 缺陷 | 现象 | 根因 | 修复 |
|---|---|---|---|
| 无限更新循环 | 点击「聚焦」后整页崩溃：`Maximum update depth exceeded`，`canvas` 归零 | `useAtlasComposition` 每次渲染都返回新数组，导致上层 `useMemo` 依赖永久失效 | 在 Hook 内 memo 化返回的数组引用；上报回调改用 ref 持有；同结构上报去重 |
| 缺错误边界导致白屏 | WebGL 上下文丢失后页面可交互元素为 0 | React 19 下未捕获渲染异常会卸载整个根节点 | 新增应用级与舞台级错误边界 |
| 细胞热标缺失 | 神经元第 4 个热标（髓鞘）在默认机位下不渲染 | 依赖 drei `Html` 的隐式剔除；且模型未做取景归一化 | 改为**自研投影式热点层**（普通 DOM + 每帧投影）；新增确定性取景归一化 |
| 器官取景过远 | 器官页只看到一个很小的器官 | 见 §3.3 | 子树几何范围取景 + 局部隔离 + 主动复位 |

## 4. 状态与生命周期

- **导航状态**：`mode(explore|learn)`、当前尺度、选中实体 / 结构、面包屑、课程步骤。
  学习进度写入 localStorage（`bodyday.discovered.v1` / `bodyday.lessons.v1` / `bodyday.prefs.v1`），
  可一键清空；不为轻量学习记录新建后端。
- **资源生命周期**：模型按解剖系统懒加载；组件卸载或依赖变化时用 `AbortController`
  中止过期请求；三维场景随路由卸载并释放 GPU 资源。
- **相机**：`VanatomeViewer` 使用其自带平滑相机；`ModelStage` 使用 Drei `OrbitControls`
  加自研 `FocusRig`（阻尼插值 + 收敛判定）。`prefers-reduced-motion` 时关闭阻尼与转场动画。

## 5. 动效语义

与设计基线一致，只保留五类有解释力的动画：

| 类型 | 回答的问题 | 落点 |
|---|---|---|
| Hover | 这个元素可以被操作吗？ | 细线加宽、抬升（可中断、只发生一次） |
| Selection | 当前选中的是哪一个？ | 列表共享指示线 `scaleY` 滑动；3D 结构高亮 |
| Route | 我是「进入」还是「返回」？ | 页面进入位移（View Transition 不可用时轻量降级） |
| Camera | 我在空间中的哪里移动到哪里？ | 器官子树取景、结构聚焦 |
| Scale | 换模型时尺度差多少？ | 尺度轴遮罩：`人体 → 器官 → 细胞 → 结构` |

`prefers-reduced-motion: reduce` 时全部降级为**瞬时**，而不是换一段更短的动画。

## 6. 已知限制（如实记录）

1. 三维模型为科普示意：器官不按真实比例；`position` 锚点不等于真实包围盒，
   因此器官取景的距离系数是**实测定标**的结果，不是几何精确计算。
2. 细胞模型为程序化概括形态，不代表真实细胞形态学，也不按真实比例。
3. 人体层 atlas 资产从官方 CDN 按需加载；断网时三维舞台会给出明确错误与重试入口，
   文字知识、结构清单与来源仍可阅读。可通过 `VITE_BODYDAY_ATLAS_URL` 指向自建镜像。
4. 组织层（tissue）以文字说明与上层结构呈现，不做体渲染 —— 这是有意的范围裁剪。
