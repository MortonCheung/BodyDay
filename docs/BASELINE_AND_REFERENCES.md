# BodyDay · 基线勘察与参考资料记录（Phase 0）

> 记录时间：2026-10-14 夜间。所有结论均来自本机真实文件、真实网络响应与真实命令输出。

## 1. 本机环境

| 项 | 实测值 |
|---|---|
| OS | macOS |
| Node | v24.15.0 |
| npm | 11.12.1 |
| git | 2.39.5 (Apple Git-154) |
| 外网 | github.com / registry.npmjs.org / unpkg.com 均 HTTP 200 |

## 2. BodyDay 仓库现状

- 工作目录：`/Users/morton_cheung/Desktop/比赛/科普设计大赛`，属于 `https://github.com/MortonCheung/BodyDay.git`。
- 分支 `main`，HEAD 只有 1 个提交：`b2940d3 feat: 初始化《身体的一天》寝室 3D Demo`。
- 工作区干净（仅未跟踪的任务书 md）。
- 应用位于子目录 `body-day/`，技术栈：React 19.2 / R3F 9.8 / Drei 10.7 / Three 0.186 / TypeScript 6 / Vite 8 / oxlint。
- 现有代码是旧「大学寝室 3D Demo」：`src/App.tsx` 加载寝室场景 + WASD 移动角色 + 门口弹窗 HUD；`public/models/` 为 Kenney Furniture Kit（CC0，20 个 GLB）。
- 保留策略：保留 Git 历史、`report/` 旧材料与物理文件；旧寝室代码移出默认入口但保留在仓库中可追溯（不删除、不强推）。

## 3. 两个参考路径（均真实存在并已遍历）

### 3.1 `/Users/morton_cheung/Desktop/比赛/References/design-references`

存在。一级子目录（部分，目录含 40000+ 字符内容，已用子代理遍历）：

| 子目录 | 类别 | 许可 | 结论 |
|---|---|---|---|
| `GSAP/` | 动效库 | GreenSock standard "no charge" license | 可商用；含 `@gsap/react` `useGSAP()`，适配 React 19。**未直接引入**（本项目用自研 CSS/motion 令牌即可，避免增加运行时体积） |
| `gsap-skills/` | Skill/指令 | MIT | 仅作 GSAP 使用规范参考 |
| `anime/` | 动效库 | MIT | `animejs` 4.5.0。未引入 |
| `lottie-web/` | 动效资源 | MIT | 5.13.0。未引入 |
| `motion/` | 动效库 | MIT | framer-motion / motion-one。未引入（改用 CSS + 少量 WAAPI） |
| `inspira-ui/` | Vue/Nuxt UI | 见 LICENSE | 依赖 gsap/motion-v/three。**Vue 生态，不与本 React 工程混用**，仅作视觉灵感 |
| `awesome-design-md/` | 文档 | 见 LICENSE | 设计清单参考 |
| `archify/` | 工具/Skill | 见 LICENSE | 图表/架构预览工具，与本项目无关 |
| `impeccable/` | Skill 工程 | 见 LICENSE | 设计质量规范，仅作原则参考 |

**采纳结论**：该库核心价值是「动效与设计规范」，而非可直接嵌入的 3D 解剖组件。BodyDay 不复制其代码，只在设计令牌与动效语义上借鉴同名思路（hover/selection/route/camera/opening 六类）。

### 3.2 `/Users/morton_cheung/Desktop/比赛/大数据分析/AgriScope/frontend`

存在，为生产级 React 前端。已实读的关键文件：

- `docs/VISUAL_BASELINE.md` —— 暖白纸面 `#f7f5f1`、墨色 `#1a1917`、衬线展示字、直角（圆角 0）、细线分隔、低密度、大主角；明确「旧文档 3/6px 圆角已过时，以实际源码为准」。
- `docs/MOTION_LANGUAGE.md` —— 六类动画（Hover/Selection/Route/Camera/Chart/Opening），判断标准「删掉它用户是否更难理解」；`prefers-reduced-motion` 降级为**瞬时**而非换短动画。
- `src/design/tokens.css` —— 完整色板/时长/语义色/z-index 令牌。
- `src/design/typography.css` —— `--ag-font-display`（Songti SC/Noto Serif SC/Georgia）、正文系统无衬线、标签等宽。
- `src/design/layout.css` —— 间距 4…176px、`--ag-container/--ag-vite`、控件骨架（直角按钮、下划线式 chip）。
- `src/design/motion.ts` —— `MOTION_DURATION` / `MOTION_EASE` / `MOTION_SPRING` 与 `motionDuration()`。
- `docs/FRONTEND_ARCHITECTURE.md` —— 单 Canvas 生命周期、`frameloop="demand"`、按需分包、`setLookAt(..., smooth)` 相机、看门狗超时。

**注意**：AgriScope 文档中的 `/Users/morton_cheung/Desktop/比赛/大数据分析/reference/design-references` 与本任务的新增路径 `/Users/morton_cheung/Desktop/比赛/References/design-references` **不是同一路径**，已分别确认存在性，未被合并对待。

## 4. 官方竞赛附件（本机真实存在）

- `附件1 非医类健康科普赛道比赛方案.docx`（190,948 字节）—— 存在于工作目录。
- `附件2 微生物艺术创作科普实验赛道比赛方案.doc`、`附件3 "医志园"中医药科普手绘赛道比赛方案.docx`。
- 已核实规则（来自任务书与附件）：非医类健康科普赛道第 4 组「健康科普小程序、H5 交互式和电子杂志设计」；H5 原则上不少于 10 页（含封面封底）、控制在 20 页内；须提供源程序与 ≤8 分钟演示视频；附件 1-5《作品开发文档》需真实编写；网络平台报名与提交截止 **2026-10-18**；学校须审核推荐（人工环节，不得伪造）。

## 5. 候选开源资产的真实可用性核验（全部实测）

| 资产 | 实测结果 | 许可 | 采纳 |
|---|---|---|---|
| `@vixotic/vanatome-react@0.1.6` | npm 存在；peerDeps = drei ^10 / fiber ^9 / react ^19 / three ^0.180 —— **与现工程完全兼容**；ESM-only，含 TS 声明 | MIT（代码） | **采纳**（人体层） |
| `@vixotic/vanatome-atlas@0.1.4` | npm 存在 | MIT | **采纳**（atlas 加载器） |
| Vanatome 官方 atlas CDN | `https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json` HTTP 200，8712B；`access-control-allow-origin: *`（带 Origin 实测） | 资产 Z-Anatomy 衍生 **CC BY-SA 4.0** | **采纳**，须署名+标明修改+ShareAlike |
| atlas 内容 | 12 个 bundle：cardiovascular(69结构,8.0MB) / lymphatic(含 `spleen` 结构ID) / nervous(含 `brain*` 结构ID，metadata 55KB) 等；单系统按需 lazy-load | — | **采纳**，逐系统加载 |
| 器官 GLB（`HongChao6/open-anatomy-studio` → `public/models/`） | 实测存在：`brain.glb` 2.83MB、`heart.glb` 569KB、`spleen.glb` 70KB、kidney/liver/lungs/pancreas 等 | HRA（HuBMAP）**CC BY 4.0**，署名「HRA 3D organ models © Human Reference Atlas (CC BY 4.0), HuBMAP.」 | **采纳**（器官独立视图） |
| `cclank/cell-architecture-studio` | 仓库存在；根含 LICENSE | 见其 LICENSE；但其大型细胞 GLB 许可不明（任务书已提示） | **不采纳模型**；细胞改用**自研程序化几何**（许可干净、可控热点） |
| `vixotic/Vanatome`、`ashemag/human-atlas`、`Grypa-JJ/anatomy-atlas-3d`、`GordenSun/LearningCell`、`donmccurdy/glTF-Transform` | 仓库均 HTTP 200 存在 | 见各自 LICENSE | 记录为备选，未引入 |

## 6. 与任务书假设的差异与修正

1. **Vanatome 自带 Canvas**（源码 `packages/react/src/VanatomeViewer.tsx` 第 1143 行 `<Canvas>`，且未设置 `attach="background"`）→ 默认背景透明，可置于暖白纸面舞台之上，符合「暖白低密度」美术目标。因此采用**路由级单活跃 Canvas**：人体/器官路由挂 Vanatome 或自研 Viewer，切换时完整卸载。
2. **细胞模型放弃第三方 GLB**，改为程序化几何，规避许可不明风险，并满足任务书「优先利用合法程序化白细胞/神经元」的指引。
3. **参考库 `design-references`** 不含可直接嵌入的医学 3D 组件，其价值在设计/动效规范层面。

## 7. 许可疑点与阻塞（须在交付文档中交代）

- Vanatome atlas 资产为 **CC BY-SA 4.0**：BodyDay 对 atlas 的**适配改造**（如 ID 映射、外观调整）在分发时须以相同条款共享；代码部分仍为 MIT。
- HRA 器官模型为 **CC BY 4.0**，须完整署名。
- 学校盖章审核、平台报名提交为**人工环节**，本 Agent 不代为完成，也不声称已提交。
