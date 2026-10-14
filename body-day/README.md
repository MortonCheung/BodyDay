# BodyDay · 身体的一天

> 面向 2026 辽宁省大学生科普设计大赛「非医类健康科普赛道」的**跨尺度交互式健康科普 H5 作品**。
> 从一具可以转动的完整人体出发，逐层进入系统 → 器官 → 细胞 → 细胞内部结构，
> 每一层都能点击、能追问、能回溯，并且告诉你这条知识来自哪里。

作品包含两种模式，共用同一套模型舞台：

- **自由探索**：自己决定看哪里。转动人体、切换解剖系统、把镜头推进到器官、再向下进入细胞。
- **引导教学**：由结构化课程带着走。每一步都要求你在**真实模型**上完成一个可检测的交互，并配带解释与来源的测验。

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

## 15 个页面

| 序号 | 页面 | 路径 | 尺度 |
|---|---|---|---|
| 01 | 封面 | `#/` | — |
| 02 | 使用向导（含「尺度练习」交互） | `#/guide` | — |
| 03 | 人体总览 | `#/body` | 人体 |
| 04 | 人体系统（神经 / 循环 / 淋巴等） | `#/systems/:systemId` | 系统 |
| 05 | 大脑探索 | `#/organ/brain` | 器官 |
| 06 | 神经元探索 | `#/cell/neuron` | 细胞 |
| 07 | 神经科普课 | `#/lesson/neural` | 器官 → 细胞 |
| 08 | 脾脏探索 | `#/organ/spleen` | 器官 |
| 09 | 白细胞探索 | `#/cell/leukocyte` | 细胞 |
| 10 | 免疫科普课 | `#/lesson/immune` | 细胞 |
| 11 | 心脏探索 | `#/organ/heart` | 器官 |
| 12 | 循环关联课 | `#/lesson/circulation` | 器官 → 细胞 |
| 13 | 科学关系图 | `#/relations` | — |
| 14 | 学习总结 | `#/summary` | — |
| 15 | 封底 / 关于（方法 + 来源 + 版权 + 免责） | `#/about` | — |

逐页截图与可访问路径见 `docs/H5_PAGE_INDEX.md`。

> 使用 HashRouter 是刻意的选择：作品以网址链接提交，可能部署在任何静态托管上，
> Hash 路由不依赖服务端重写规则，直接粘贴链接与刷新都能正确恢复视图。

---

## 操作方式

| 输入 | 行为 |
|---|---|
| 左键拖动 / 单指拖动 | 旋转模型 |
| 滚轮 / 双指捏合 | 缩放 |
| 右键 / 双指平移 | 平移（人体层支持右键呼出结构菜单） |
| 单击结构或热标 | 选中，右侧显示对应知识 |
| 空白处单击 | 取消选中 |
| Tab / Enter / Space | 键盘遍历与选中结构 |
| `prefers-reduced-motion: reduce` | 所有动画降级为**瞬时**，不播放转场 |

---

## 两条可交互的贯通路线

1. **人体 → 大脑 → 神经元 → 胞体 / 树突 / 轴突 / 髓鞘 → 返回**（神经科普课）
2. **人体 → 脾脏 → 白细胞 → 细胞膜 / 细胞质 / 细胞核 → 返回**（免疫科普课）
3. 另有 **心脏 → 循环 → 白细胞** 的功能关联路线（循环关联课），关系类型显式标注为「循环输送」。

---

## 技术栈与架构

React 19 + TypeScript + Vite 8 + Three.js / React Three Fiber / Drei，单页应用（HashRouter）。

```
src/
  app/        路由、外壳、双模式与跨尺度转场遮罩
  domain/     纯数据：实体、科学关系、引导课程、来源表、系统表
  services/    atlas 加载与结构映射、本地学习记录、区域注解
  design/     设计令牌、排版、版面、组件、舞台样式、动效令牌
  three/      三维舞台（人体 / 器官 / 细胞）、程序化细胞几何、按需加载入口
  components/ 共享 UI：页头、面包屑、知识卡、来源列表、测验、错误边界与降级
  features/   15 个页面
  legacy/dorm/  旧「寝室 3D Demo」代码（归档保留，不在新应用入口中）
```

关键工程决策（详细说明见 `docs/ARCHITECTURE.md`）：

- **路由级单活跃 Canvas**：人体层由 VanatomeViewer 自带 Canvas，细胞层由自研舞台自带 Canvas；
  路由保证同一时刻只有一个活跃 WebGL 场景，切换时旧场景完整卸载。
- **三维运行时按需加载**：`three` + R3F 被打进独立分块（约 246 KB gzip），
  只有进入三维页面才下载；封面 / 向导 / 关系图 / 学习总结 / 关于的首屏不承担这部分体积。
- **结构 ID 必须真实存在**：所有聚焦与选中都先确认该 ID 在 atlas 元数据中命中，禁止写死猜测 ID。
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
