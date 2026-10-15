# 02 · 架构与交互设计（BodyDay V2）

> 记录时间：2026-10-15。前置事实见 `00_BASELINE_AND_FEASIBILITY.md` 与 `03_EXPLOSION_FEASIBILITY.md`。

---

## 1. 引擎选型（最终）

| 层 | V1 | V2（最终） |
|---|---|---|
| 人体 / 器官渲染 | `@vixotic/vanatome-react` 0.1.6（第三方 Viewer） | **自建 R3F 舞台 `FullBodyStage`**，直接加载 atlas 自有 `curated-full-body` 单文件整具人体 |
| 资产 | atlas 按系统拆分的 bundle（体表+骨骼起步，再按系统加载） | **同一个 30.4 MB 整具人体 GLB**（984 节点 / 1,746,560 三角形），一次加载 |
| 细胞渲染 | 自研 `CellStage` / `ModelStage`（程序化几何） | **不变**（沿用） |
| 活跃 Canvas 数 | 2（Viewer 的 Canvas + ModelStage 的 Canvas） | 人体舞台与细胞舞台**互斥挂载**，同一时刻只有一个活跃 Canvas |

选择"自建"而不是引入 Human Atlas 的实测理由（四条硬证据）见 `03_EXPLOSION_FEASIBILITY.md` §2。
一句话：**同一套资产、同一套许可、同一套 ID 体系、同一个 three 版本**就能拿到可逐节点位移的真拆解，
而 Human Atlas 会带来第二套引擎、第二套资产与第二套 ID。

> 旧 Vanatome 实现从正常用户路径退出，但**保留在 Git 历史中可回退**，不与新引擎并行加载。

---

## 2. 模块结构

```
src/
  app/
    AppShell.tsx            # 稳定宿主：顶栏 + 启动封面闸门 + 视图分发
    resolveView.ts          # URL → 视图（不拆分组件树，避免重新挂载三维场景）
    routes.ts               # ROUTES + PAGE_INDEX（页面计数口径）
    AppProviders.tsx        # 精简：只保留必要的全局状态
  features/
    explore/                # 新的探索界面（人体/器官/细胞三态共用）
      StartupCover.tsx      # 全屏加载封面 + 人工「进入探索」
      ExploreStage.tsx      # 舞台容器 + 滚轮语义调度
      StructurePanel.tsx    # 右侧精简知识卡（可收起，选中才出现）
      StageHints.tsx        # 底部极简提示 + 拆解状态
    about/AboutPage.tsx     # 完整来源 / 许可 / 声明 / 页面索引
  three/
    fullBody.ts             # 纯函数：结构索引、父子映射、包围盒、拆解位移
    FullBodyStage.tsx       # 自建 R3F 整具人体舞台（拆解 + 点选 + 聚焦 + 隔离 + 复位）
    CellStage.tsx           # 沿用（程序化细胞）
    ModelStage.tsx          # 沿用（DOM 热点层，非 drei Html）
    cellGeometry.ts         # 沿用（19 项单测覆盖）
  domain/                   # 不变：16 实体 / 14 关系 / 19 来源 / 引导脚本历史资产
  services/atlas.ts         # 保留：catalog 解析、URL 解析、结构→实体映射
  design/                   # 设计令牌与排版（统一，不新增第二套视觉体系）
```

**删除**：`features/workbench/StructureRail.tsx`（左栏目录）、头部模式开关与其状态引用、
`features/workbench/GuidePanel.tsx` 的用户可见入口（引导脚本数据保留为历史资产）。

---

## 3. 就绪契约（引擎无关）

```ts
type SceneStatus = 'loading' | 'ready-to-enter' | 'entering' | 'exploring' | 'error';

interface SceneReadiness {
  status: SceneStatus;
  progress: { loaded: number; total: number | null; percentage: number | null };
  error: { code: string; message: string; hint: string } | null;
  enter: () => void;   // 仅在 ready-to-enter 有效
  retry: () => void;   // 仅在 error 有效
}
```

- 由舞台实现方提供 `onReady / onProgress / onError`，`StartupCover` 只消费契约。
- `onReady` 的语义（实测）："当前请求的全部模型都已装配完成"。
  封面在 `onReady` 之后再等一个 `requestAnimationFrame` 才切到 `ready-to-enter`。
- `percentage` 来自真实字节进度；拿不到总量时置 `null`，界面显示不确定进度动画。
- 封面按会话只出现一次：`exploring` 之后，应用内导航不再回到封面。

---

## 4. 状态归属

| 状态 | 归属 | 说明 |
|---|---|---|
| 场景就绪 / 加载 / 错误 | `StartupCover` + 舞台适配器 | 应用级，不随路由重置 |
| 当前选中结构（真实结构 ID） | 探索界面单一状态源 | 模型点选与路由都写回同一个值 |
| 科学实体映射 | 由 `domain/entities.ts` + `services/atlas.ts` 派生 | 选中 → 实体 → 知识卡，单一数据源 |
| 层级栈（body→system→organ→cell→part） | 探索界面 | 每级记录相机状态、可见图层、拆解程度，用于"返回上一级" |
| 拆解程度 `explosionProgress ∈ [0,1]` | 探索界面 | 在人体总览状态由滚轮驱动；进入器官/细胞后保留但不再被滚轮改动 |
| 滚轮语义 | `ExploreStage` 调度 | 按当前状态决定"拆解"或"缩放"，二者互斥 |

---

## 5. 拆解的实现要点

1. 加载整具人体 GLB（`useGLTF`，支持 `VITE_BODYDAY_ATLAS_URL` 覆盖基址）。
2. 按 `userData.anatomyId` 建立 `结构 → 网格集合` 索引；用 `anatomyParentId` 归并到器官级结构。
3. 位移方向：**从人体纵轴指向该结构组包围盒中心的水平径向分量** + 少量沿纵轴的竖直分量。
   距离按该组真实半径与整具人体尺度之比定标，并按层（体表 / 骨骼 / 内部系统）分层系数放大。
   **禁止随机向量，禁止照搬清单式排布**；拆解初期必须保持人体轮廓可辨认。
4. `progress` 驱动：位移 = `f(progress)` 每次重新计算，**不做累加** ⇒ 反复拆装不产生累计偏移。
5. 结构与点选：拆解后网格仍带原 `userData.anatomyId`，Raycast 命中后归并为结构 ID；
   拖动旋转用指针位移阈值（约 6px）与点选区分。
6. 高亮：共享一个高亮材质，悬停/选中时整组换材质，移出恢复 ⇒ 不逐网格克隆材质。
7. 聚焦：用该组**真实包围盒**计算相机目标与距离，动画 600–800ms。
8. 隔离：隐藏其它组（体表可保留并降低不透明度），返回时恢复。

---

## 6. 视觉系统（对照 Lujo Living 参考，只取设计方法）

| 维度 | 规格 |
|---|---|
| 背景 | 暖白 `--bd-paper #f7f5f1`；抬升面 `#fcfbf8`；下沉面 `#f0ede7`；展示区用暖灰 |
| 文字 | 近黑 `--bd-ink #1a1917`；次级 `#4a4641`；弱化 `#736d65` / `#9c968c` |
| 强调色 | 仅保留解剖语义色（神经石板蓝、循环陶土红、免疫橄榄绿等），**不做装饰性配色** |
| 字体 | 中文衬线标题（`Songti SC`/`Noto Serif SC` 栈）；正文无衬线；技术标记等宽但仅用于极小面积 |
| 形状 | 直角为主（`--bd-radius: 0`）；圆点/进度球可用胶囊 |
| 分隔 | 1px 细线（`rgba(26,25,23,.07/.12/.26` 三级） |
| 阴影 | 极克制，只给抬升面板 |
| 留白 | 页面级大留白；模型区域占据主要可用宽度 |
| 动效 | 统一缓动 `cubic-bezier(0.16,1,0.3,1)`；统一时长令牌；支持 `prefers-reduced-motion` |

**禁止**：蓝紫渐变、廉价霓虹、满屏玻璃卡片、无意义旋转粒子、过量阴影发光、大量装饰图标、
工程调试风格文本、为填满空间而放置无关面板。

**不复制参考站点的商业结构**：无购买按钮、价格、材质/颜色购买选项、搭配商品、规格菜单。

---

## 7. 性能与资源策略

| 项 | 策略 |
|---|---|
| 首屏 | 只要求整具人体就绪；细胞与其它资源按需/后台预加载 |
| 体积 | 一次 30.4 MB 整具人体（取代"体表 6.3 + 骨骼 3.9 MB 起步、再按系统加载 3.9～11.3 MB/个"） |
| 绘制调用 | 984 网格；按图层显隐裁剪可见组（初始只显示体表 + 骨骼），同材质复用实例 |
| 重复下载 | 依赖浏览器缓存与 drei `useGLTF` 缓存；不重复请求同一模型 |
| 境外 CDN | 失败可重试；可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本自建镜像 |
| 不做 | 不为"全程单 Canvas"这一指标牺牲体验；如确需舞台切换，使用受控转场而非黑屏 |

---

## 8. 路由策略

- 保留全部可直达路由（`/`、`/body`、`/systems/:id`、`/organ/:id`、`/cell/:id`、`/about`），
  用于状态恢复、直接访问与页面计数；**用户界面不再暴露系统/器官/细胞导航菜单**。
- 路由不拆分组件树：探索态的所有路径共用同一个探索界面实例，避免切换时重新挂载三维场景导致镜头跳动。
- 页面计数口径与不确定性声明见 `01_PRODUCT_BEHAVIOR.md` §8。

---

## 9. 测试策略

| 层 | 内容 |
|---|---|
| 纯函数单测 | `fullBody.ts`（拆解位移可复现、不累计、钳制）、`cellGeometry`（已有 19 项）、`domain`（已有 22 项的数据完整性护栏） |
| 状态机单测 | 启动封面：未就绪不可进入、就绪不自动进入、点击后才进入、错误可重试、重复回调不重复入场 |
| 层级单测 | 真实结构才可选中、结构 ID 正确映射实体、不存在的目标不可聚焦、父子层级正确、返回上下文正确 |
| 浏览器实测 | 冷启动不暴露内部、真实点击/拖动/滚轮、拆解位移真实发生、拆解后可点选、跨尺度进入与返回、错误重试、移动视口 |

**单元测试不能代替浏览器测试。** 关键交互必须在真实运行页面里验证并留存截图/录屏证据。
