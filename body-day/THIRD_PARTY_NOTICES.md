# BodyDay · 第三方资源与许可声明（THIRD_PARTY_NOTICES）

> 本文件记录 BodyDay 使用到的全部第三方代码、模型、数据与来源，并如实标注本作品的修改。
> 原则：**无明确授权的资源不进入交付包；上游署名与许可不因改编而消失。**
> 版本基准：V2.1 + 10/18 施工（详见 `docs/RELEASE_STATUS.md` 与 `delivery/FINAL_HANDOFF_20261018.md`）。

---

## 1. 运行时第三方依赖（npm）

| 包 | 版本（package.json 声明） | 许可 | 用途 |
|---|---|---|---|
| `react` / `react-dom` | ^19.2.8 | MIT | UI 运行时 |
| `react-router-dom` | ^7.18.4 | MIT | 路由（HashRouter，适配静态托管） |
| `three` | ^0.186.1 | MIT | WebGL 渲染 |
| `@react-three/fiber` | ^9.8.1 | MIT | React 渲染器 |
| `@react-three/drei` | ^10.7.9 | MIT | OrbitControls / useGLTF / useProgress |
| `@vixotic/vanatome-react` / `@vixotic/vanatome-atlas` | ^0.1.6 / ^0.1.4 | MIT | **当前代码已不再引用**（见下方说明） |

开发期依赖：`vite`、`typescript`、`oxlint`、`vitest`（均 MIT 或 Apache-2.0，不进入产物）。

> 说明（与代码一致）：V2 起人体渲染改为本工程自建的 R3F 舞台（`src/three/FullBodyStage.tsx`），
> 源码中已无任何 `@vixotic/*` 的 import（可 grep 验证）。这两个包仍保留在 `package.json` 中，
> 目的是让 Git 历史里那套基于 Vanatome 查看器的旧实现在任意检出点都能照原样安装运行，
> **不构成当前交付代码的第三方依赖**。上游公开 API 只提供 select / focus / isolate /
> reset / visibleLayers，没有逐网格位移入口，因此无法用它实现本作品要求的真实几何拆解——
> 这是放弃它的技术原因，不是许可原因。

---

## 2. 解剖模型与图谱资产

### 2.1 人体与器官三维模型（Vanatome Human Atlas 1.4.0）

- **来源仓库**：https://github.com/vixotic/Vanatome
- **上游原始项目**：Z-Anatomy — The libre 3D atlas of anatomy
  （https://github.com/Z-Anatomy/Models）
- **原始贡献者**：Gauthier Kervyn（设计 / 三维 / 解剖）、Marcin Zielinski（Python 脚本）
  以及 Z-Anatomy 项目记录的其他贡献者与上游来源。
- **许可**：**Creative Commons Attribution-ShareAlike 4.0 International（CC BY-SA 4.0）**
  （https://creativecommons.org/licenses/by-sa/4.0/）
- **本作品实际使用的那一个文件**：`z-anatomy-1.4.0-full-body.glb`
  （984 网格 / 1,746,560 三角形 / 749 个解剖结构 ID），随源码包分发的路径为
  `body-day/public/models/z-anatomy-1.4.0-full-body.glb`。
- **BodyDay 的适配内容（= 需声明的「修改」）**：
  1. **公开展示过滤**：移除非公开场合不宜展示的细节结构——生殖系统 14 个网格，
     以及体表外壳中覆盖该区域的 2 个分区网格（`Urogenital region`）与 2 个毛发网格
     （合计 17 个网格，984 → 967）。**保留覆盖该区的其余体表外壳**，实测正面 / 左右侧面 /
     背面 / 骨盆近观均无空洞；被移除外壳后露出的是真实骨盆与肌肉结构，未用遮挡物掩盖。
  2. **真实几何「拆解」**：按解剖系统分层（体表 → 肌肉 → 骨骼 → 内脏 → 神经/内分泌）
     对网格做径向位移，位移量由拆解进度重算而非累加（可逆、无累计偏移）；体表外壳随进度
     渐进淡出并在约 40% 起移出可见集合。位移距离是为看清结构而放大的示意量，
     不代表器官在体内会彼此远离。
  3. **材质与高亮改写**：解剖系统统一的暖调色板（象牙 ↔ 陶土，内脏保留图谱原色），
     选中/悬停以自发光叠加而非纯色替换；选中时其余结构淡出到 0.16（外壳 0.10）而非隐藏。
  4. **结构 ID → BodyDay 实体映射**（`src/services/atlas.ts`）：点选结果沿解剖父链
     归并到已登记结构，未登记节点用图谱真实字段生成通用结构卡。
  5. **结构选择与知识层**：本作品自建的选中/聚焦/隔离、镜头快照恢复与科普卡层。
- **再分发义务**：本作品随源码包分发了该 GLB，因此**必须**保留署名、标明修改、
  附许可链接，并以**相同方式共享**（CC BY-SA 4.0 的 ShareAlike 条款）。
  交付包内已包含 `body-day/public/models/ANATOMY_LICENSE.txt` 与本文件。

### 2.2 已评估但**未采用**的模型与代码

| 资源 | 评估结论 | 未采用原因 |
|---|---|---|
| `HongChao6/open-anatomy-studio` → `public/models/*.glb` | 实测内容为**局部解剖参照**：`brain.glb` 仅含嗅球与视交叉；`heart.glb` 仅含二尖瓣与主动脉瓣；`spleen.glb` 仅含脾结肠面 | 不足以代表完整器官，若标注为「脑 / 心 / 脾」会构成**科学误导**。模型本身为 HRA / HuBMAP CC BY 4.0，许可允许，但内容不适用 |
| `cclank/cell-architecture-studio` 的细胞 GLB | 白细胞模型约 54 MiB，且大型细胞模型再分发许可不明 | 许可不清 + 移动端体量过大。**BodyDay 改用自研程序化几何** |
| `GordenSun/LearningCell`、`JDerekLomas/blendercell`、`QI-flowy/3DArchitectureStudio` | 教学素材 / 许可不明 | 不采纳 |
| `hubmapconsortium/hra-ui` 等关系数据仓库 | 未直接引入代码 | 科学关系由 BodyDay 自撰并标注权威来源 |
| **Human Atlas（`ashemag/human-atlas`）** | 代码 MIT、几何 BodyParts3D 为 CC BY 4.0；其 `app/explosion-layout.ts` + `app/scene.tsx` 提供真实网格的二维投影打包与 `explode` 位移 | **本次未移植**：其渲染栈为 three ^0.159 且不使用 R3F，与本源工程的 three 0.186 / R3F 9 不兼容；仓库约 154 MB、模型约 90 MB，且使用另一套 BodyParts3D ID 体系，无法与 Z-Anatomy 的 ID 混用。10/18 交付前无法在 90 分钟止损窗口内完成可维护移植（详见交付手册的路线 A / 路线 B 决策记录） |

> 上述评估的完整记录见 `docs/REFERENCE_ADOPTION.md`。

---

## 3. 科普内容来源

作品中的全部知识条目与解释均带来源编号（S01–S19），完整清单见
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

- **单工作台交互模型**：中央固定三维人体 + 单侧知识纸条；点击模型即选中，
  `Esc` 或点空白退出选中并恢复选中前的相机快照（位置、观察目标与取景一并回退）；
- **滚轮驱动的分层拆解时间线**：纯函数位移内核（`src/three/fullBody.ts`）、
  按解剖系统的分层位移与外壳渐隐、可逆且不累计偏移；
- **通用结构卡生成**（`src/domain/structureCard.ts`）：只用图谱真实字段出卡，缺字段即省略；
- 视觉系统（令牌、排版、组件、舞台版面）；
- 全部科普文本与健康行动说明；
- 科学关系数据模型（关系类型语义化，禁止自动兜底关系）；
- **程序化神经元 / 白细胞几何**（`src/three/cellGeometry.ts`）；
- 启动闸门（同节点形变入口）、页面编排、错误边界与降级策略。

---

## 6. 明确声明

- 本作品为健康科普作品，**不构成医疗建议**，不可用于诊断、治疗或用药决策。
- 三维模型为科普示意，不按真实比例；细胞为程序化概括形态。
- 「拆解」是按解剖系统分层平移真实几何并隐去体表外壳的示意表现，不代表器官在体内会彼此远离。
- **未实现**：同一前视平面上的二维投影打包（Human Atlas 式 planar packing）。
  本作品的展开是真实几何的分层径向分离，不声称具备平面排列能力。
