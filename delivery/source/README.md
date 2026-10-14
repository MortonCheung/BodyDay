# BodyDay · 身体的一天

> 面向 2026 辽宁省大学生科普设计大赛「非医类健康科普赛道」的**跨尺度交互式健康科普 H5 作品**。
> 中央始终是**同一具可以转动的完整人体**，左右两侧是结构与知识两条纸条；
> 点模型上的结构，右侧知识随选中联动。人体 → 系统 → 器官 → 细胞之间的差别，
> 只体现为**镜头与两侧面板内容的变化**，不换页面外壳、不重挂三维场景。

作品包含两种模式，共用同一个空间工作台与同一具三维人体：

- **自由探索**：自己决定看哪里。转动人体、切换解剖系统、把镜头推进到器官、再向下进入细胞。
- **引导教学**：右纸条顶部插入一条步骤引导。每一步都把镜头带到**真实结构**上，需要时内嵌一道检验题。

---

## 快速开始

```bash
cd body-day
npm install          # 或 npm ci（锁定文件匹配时）
npm run dev          # 开发模式 → http://localhost:5173/
```

生产构建与本地预览：

```bash
npm run build        # tsc -b && vite build，产物在 dist/
npm run preview      # 预览生产构建 → http://localhost:4173/
```

质量检查：

```bash
npm run lint         # oxlint
npm run test         # vitest（领域数据完整性 + 程序化细胞几何）
```

### 可选环境变量

| 变量 | 作用 | 默认 |
|---|---|---|
| `VITE_BODYDAY_ATLAS_URL` | 指向与官方同版本的 Vanatome atlas 目录（自建镜像），用于部署环境无法访问外网时 | 官方 CDN `https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json` |

---

## 11 个页面

| 序号 | 页面 | 路径 | 尺度 |
|---|---|---|---|
| 01 | 封面 · 身体的一天 | `#/` | 人体 |
| 02 | 人体总览 | `#/body` | 人体 |
| 03 | 神经系统 | `#/systems/nervous-system` | 系统 |
| 04 | 循环系统 | `#/systems/cardiovascular-system` | 系统 |
| 05 | 淋巴系统 | `#/systems/lymphatic-system` | 系统 |
| 06 | 大脑 | `#/organ/brain` | 器官 |
| 07 | 心脏 | `#/organ/heart` | 器官 |
| 08 | 脾脏 | `#/organ/spleen` | 器官 |
| 09 | 神经元 | `#/cell/neuron` | 细胞 |
| 10 | 白细胞 | `#/cell/leukocyte` | 细胞 |
| 11 | 关于 · 数据与方法 | `#/about` | — |

除封底外，其余 10 个页面共用**同一个工作台组件**与同一套左右纸条；封面第一帧即真实三维场景。
逐页截图与实测数据见 `docs/H5_PAGE_INDEX.md`。

> 使用 HashRouter 是刻意的选择：作品以网址链接提交，可能部署在任何静态托管上，
> Hash 路由不依赖服务端重写规则，直接粘贴链接与刷新都能正确恢复视图。

---

## 操作方式

| 输入 | 行为 |
|---|---|
| 左键拖动 / 单指拖动 | 旋转模型 |
| 滚轮 / 双指捏合 | 缩放 |
| 右键 / 双指平移 | 平移 |
| 单击结构或热点 | 选中，右侧显示对应知识 |
| 空白处单击 / Esc | 取消选中，回到本页默认取景 |
| Tab / Enter / Space | 键盘遍历与选中结构 |
| 顶部模式开关 | 在「自由探索」与「引导教学」之间切换 |
| `prefers-reduced-motion: reduce` | 所有动画降级为**瞬时**，不播放转场 |

---

## 两条可交互的贯通路线

1. **人体 → 大脑 → 神经元 → 胞体 / 树突 / 轴突 / 髓鞘 → 返回**（神经类引导脚本）
2. **人体 → 脾脏 → 白细胞 → 细胞膜 / 细胞质 / 细胞核 → 返回**（免疫类引导脚本）
3. 另有 **心脏 → 循环 → 白细胞** 的功能关联路线，关系类型显式标注为「循环输送」。

---

## 技术栈与架构

React 19 + TypeScript + Vite 8 + Three.js / React Three Fiber / Drei，单页应用（HashRouter）。

```
src/
  app/        路由解析（resolveView）、稳定外壳、双模式上下文、页面索引
  domain/     纯数据：实体、科学关系、引导脚本、来源表、系统表
  services/    atlas 加载与结构映射、本地学习记录、署名文本
  design/     设计令牌、排版、版面、组件、舞台样式、动效令牌
  three/      三维舞台（人体 / 器官 / 细胞）、程序化细胞几何、按需加载入口
  components/ 共享 UI：知识卡、来源列表、测验、错误边界与降级
  features/
    workbench/  空间工作台（中央舞台 + 左右纸条 + 内嵌引导 + 欢迎层）
    about/      封底阅读页
  legacy/dorm/  旧「寝室 3D Demo」代码（归档保留，不在新应用入口中）
```

关键工程决策（详细说明见 `docs/ARCHITECTURE.md`）：

- **路由不拆分组件树**：`resolveView` 把 URL 解析成视图，`AppShell` 只用同一个 `ExploreWorkbench`
  渲染所有探索页，使三维场景在整段探索中始终挂载、不重新加载。
- **取景交给查看器**：选中并请求聚焦目标结构，由查看器遍历真实网格算包围盒决定机位
  （`body-shell` 全身 / 系统根结构 / `cerebrum`·`heart`·`spleen` 器官）。
- **三维运行时按需加载**：`three` + R3F 被打进独立分块（约 246 KB gzip），
  只有进入三维页面才下载；封底 `/about` 的首屏不承担这部分体积（实测 `canvas = 0`）。
- **结构清单折叠**：同一器官下的细分结构归并为一项，内部 ID（如 `body-shell`）不展示给用户。
- **错误边界与降级**：WebGL 不可用、上下文丢失、模型加载失败都不会白屏 ——
  舞台内显示明确说明与重试入口，页面其余内容（结构清单、知识卡、来源、导航）保持可用。

---

## 科学与版权边界

- 人体与器官模型来自 **Vanatome Human Atlas 1.4.0**（上游 Z-Anatomy，**CC BY-SA 4.0**）；
  细胞几何为 BodyDay **程序化原创**。
- 科普内容对齐《中国公民健康素养——基本知识与技能（2024年版）》方向，
  关键信息交叉核对 WHO / NIH / CDC 与 OpenStax 开放教材，逐条标注来源编号。
- 本作品**不构成医疗建议**；三维模型为科普示意，不按真实比例，标注点未做逐点解剖配准。
- 完整声明见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

---

## 交付材料

| 材料 | 位置 |
|---|---|
| 页面索引与截图 | `docs/H5_PAGE_INDEX.md` |
| 架构说明 | `docs/ARCHITECTURE.md` |
| 测试报告 | `docs/TEST_REPORT.md` |
| 来源清单与可达性校验 | `docs/SOURCES.md` |
| 参考采纳记录 | `docs/REFERENCE_ADOPTION.md`（位于仓库根 `docs/`） |
| 基线勘察 | `docs/BASELINE_AND_REFERENCES.md`（位于仓库根 `docs/`） |
| 发布状态与待办 | `docs/RELEASE_STATUS.md` |
