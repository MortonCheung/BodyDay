# BodyDay · 第三方资源与许可声明（THIRD_PARTY_NOTICES）

> 本文件记录 BodyDay 使用到的全部第三方代码、模型、数据与来源。
> 原则：**无明确授权的资源不进入交付包**。

---

## 1. 运行时第三方依赖（npm）

| 包 | 版本（package.json 声明） | 许可 | 用途 |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.8 | MIT | UI 运行时 |
| `react-router-dom` | ^7.18.4 | MIT | 路由（HashRouter，适配静态托管） |
| `three` | ^0.186.1 | MIT | WebGL 渲染 |
| `@react-three/fiber` | ^9.8.1 | MIT | React 渲染器 |
| `@react-three/drei` | ^10.7.9 | MIT | OrbitControls 等辅助组件 |
| `@vixotic/vanatome-react` | ^0.1.6 | MIT | 人体 / 器官解剖查看器 |
| `@vixotic/vanatome-atlas` | ^0.1.4 | MIT | 官方 atlas 加载器 |

开发期依赖：`vite`、`typescript`、`oxlint`、`vitest`（均 MIT 或 Apache-2.0，不进入产物）。

> 说明：`@vixotic/vanatome-react` 的 `peerDependencies` 写作 `three@^0.180.0`（0.x 语义等价
> `>=0.180.0 <0.181.0`），但其 README 明确声明支持范围为「Three.js 0.180 **或更新**」。
> 本工程沿用既有 `three@0.186.1`（与 R3F 9 / Drei 10 已验证兼容），并在 `body-day/.npmrc`
> 中以显式配置放宽 peer 校验。这是有据可依的工程决策，不是绕过依赖检查。

---

## 2. 解剖模型与图谱资产

### 2.1 人体与器官三维模型（Vanatome Human Atlas 1.4.0）

- **来源仓库**：https://github.com/vixotic/Vanatome
- **服务地址**：`https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json`
- **上游原始项目**：Z-Anatomy — The libre 3D atlas of anatomy
  （https://github.com/Z-Anatomy/Models）
- **原始贡献者**：Gauthier Kervyn（设计 / 三维 / 解剖）、Marcin Zielinski（Python 脚本）以及
  Z-Anatomy 项目记录的其他贡献者与上游来源。
- **许可**：**Creative Commons Attribution-ShareAlike 4.0 International（CC BY-SA 4.0）**
  （https://creativecommons.org/licenses/by-sa/4.0/）
- **BodyDay 的适配内容（= 需声明的「修改」）**：
  1. 结构 ID → BodyDay 实体 ID 的映射层（`src/services/atlas.ts`）；
  2. 按解剖系统进行懒加载的取用策略；
  3. 查看器外观参数调整（body shell / skeleton 的显隐与不透明度、关闭选中脉冲）；
  4. 器官层使用 `parent-context` 隔离模式做「体内聚焦」；
  5. 界面层的结构清单与聚焦入口。
- **再分发义务**：若分发本作品的适配版本，须保留署名、标明修改、附许可链接，并以**相同方式共享**。
- **本次分发策略**：BodyDay **不在源码包中再分发原始 GLB**；运行时从官方 CDN 按需加载。
  同时提供 `VITE_BODYDAY_ATLAS_URL` 环境变量，便于在无法访问外网的环境中指向**同版本自建镜像**。

### 2.2 已评估但**未采用**的模型

| 资源 | 评估结论 | 未采用原因 |
|---|---|---|
| `HongChao6/open-anatomy-studio` → `public/models/*.glb` | 实测内容为**局部解剖参照**：`brain.glb` 仅含嗅球与视交叉；`heart.glb` 仅含二尖瓣与主动脉瓣；`spleen.glb` 仅含脾结肠面 | 不足以代表完整器官，若标注为「脑 / 心 / 脾」会构成**科学误导**。模型本身为 HRA / HuBMAP CC BY 4.0，许可允许，但内容不适用 |
| `cclank/cell-architecture-studio` 的细胞 GLB | 白细胞模型约 54 MiB，且大型细胞模型再分发许可不明 | 许可不清 + 移动端体量过大。**BodyDay 改用自研程序化几何** |
| `GordenSun/LearningCell`、`JDerekLomas/blendercell`、`QI-flowy/3DArchitectureStudio` | 教学素材 / 许可不明 | 不采纳 |
| `hubmapconsortium/hra-ui` 等关系数据仓库 | 未直接引入代码 | 科学关系由 BodyDay 自撰并标注权威来源 |

> 上述评估的完整记录见 `docs/REFERENCE_ADOPTION.md`。

---

## 3. 科普内容来源

作品中的全部知识条目、测验与解释均带来源编号（S01–S19），完整清单见
`docs/SOURCES.md` 与作品内「关于」页。出版者包括：

- **国家卫生健康委员会**（《中国公民健康素养——基本知识与技能（2024年版）》）
- **世界卫生组织（WHO）**（身体活动、健康膳食、高血压、免疫接种）
- **美国国立卫生研究院（NIH）**：NINDS、NHLBI、NIDDK
- **美国疾病控制与预防中心（CDC）**
- **OpenStax（莱斯大学）《Anatomy and Physiology 2e》**（CC BY 4.0）
- **Human Reference Atlas / HuBMAP**

所有链接均在 2026-10-14 实际发起 HTTP 请求校验可达性；校验结果与异常说明记录在 `docs/SOURCES.md`。

> 本作品**不复制**上述来源的正文、图表或数据表，只引用其结论性事实并逐条署名。

---

## 4. 字体

不引入任何网络字体文件。展示层使用系统中文字体栈
（`Songti SC` / `Noto Serif SC` / `Source Han Serif SC` / `STSong` / Georgia），
正文使用系统无衬线，标签使用等宽（`SF Mono` 等）。
因此**无字体授权问题**，也不产生字体下载请求。

---

## 5. BodyDay 自身原创部分

以下内容为 BodyDay 独立创作，不是任何参考项目的二次发布：

- 产品结构与「自由探索 / 引导教学」双模式设计；
- 跨尺度导航模型（人体 → 系统 → 器官 → 组织 → 细胞 → 结构）与尺度转场语义；
- 视觉系统（令牌、排版、组件、舞台版面）；
- 全部科普文本、健康行动说明与测验题目；
- 科学关系数据模型（关系类型语义化，禁止自动兜底关系）；
- 引导课程状态机与进度持久化；
- **程序化神经元 / 白细胞几何**（`src/three/cellGeometry.ts`）；
- 页面编排、错误边界与降级策略。

---

## 6. 明确声明

- 本作品为健康科普作品，**不构成医疗建议**，不可用于诊断、治疗或用药决策。
- 三维模型为科普示意：器官不按真实比例；细胞为程序化概括形态；标注点为示意位置，
  未与模型做逐点解剖配准。
- 跨尺度切换是语义连续的镜头转场，**不声称**与真实人体空间坐标严格配准。
