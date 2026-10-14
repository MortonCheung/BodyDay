# BodyDay · 权利与来源说明（LICENSE_AND_CREDITS）

> 本文件面向赛事评审，说明作品使用了哪些第三方资源、各自许可、署名义务，
> 以及哪些部分是 BodyDay 的原创贡献。**不含任何许可不明的资源。**

## 一、运行时第三方依赖

| 包 | 许可 | 用途 |
|---|---|---|
| React / React DOM 19 | MIT | UI 运行时 |
| react-router-dom 7 | MIT | 路由（HashRouter） |
| three 0.186 | MIT | WebGL 渲染 |
| @react-three/fiber 9 | MIT | React 渲染器 |
| @react-three/drei 10 | MIT | OrbitControls 等辅助组件 |
| @vixotic/vanatome-react 0.1.6 | MIT | 人体 / 器官解剖查看器 |
| @vixotic/vanatome-atlas 0.1.4 | MIT | atlas 加载器 |

开发期依赖（vite / typescript / oxlint / vitest）不进入交付产物。

## 二、解剖模型与图谱资产

### 2.1 人体与器官三维模型

- **来源**：Vanatome Human Atlas 1.4.0（https://github.com/vixotic/Vanatome），
  上游为 **Z-Anatomy — The libre 3D atlas of anatomy**（https://github.com/Z-Anatomy/Models）。
- **原始贡献者**：Gauthier Kervyn（设计 / 三维 / 解剖）、Marcin Zielinski（Python 脚本），
  以及 Z-Anatomy 项目记录的其他贡献者与上游来源。
- **许可**：**CC BY-SA 4.0**（https://creativecommons.org/licenses/by-sa/4.0/）。代码部分为 MIT。
- **署名文本（作品内「关于」页与三维舞台均可见）**：
  > 人体与器官解剖模型：Z-Anatomy（CC BY-SA 4.0），经 Vanatome 导出为 Web 版本。
- **BodyDay 对这一素材的修改（须声明）**：
  1. 结构 ID → 作品实体 ID 的映射层；
  2. 按解剖系统懒加载的取用策略；
  3. 查看器外观参数调整（外壳 / 骨骼显隐与不透明度、关闭选中脉冲）；
  4. 器官层使用「局部隔离」实现器官独立视图，并按子树几何锚点设置入场机位；
  5. 界面层的结构清单、聚焦入口与中文区域说明。
- **再分发义务**：若分发本作品的适配版本，须保留署名、标明修改、附许可链接，
  并以**相同方式共享**。
- **本作品的分发策略**：源码包**不再分发原始 GLB**，运行时从官方 CDN 按需加载；
  同时提供 `VITE_BODYDAY_ATLAS_URL` 环境变量以便在无外网环境指向同版本自建镜像。

### 2.2 已评估但未采用的资源

| 资源 | 结论 | 原因 |
|---|---|---|
| `HongChao6/open-anatomy-studio` 的 `public/models/*.glb`（HRA / HuBMAP，CC BY 4.0） | 未采用 | 实测其内容为**局部解剖参照**：`brain.glb` 仅含嗅球与视交叉、`heart.glb` 仅含二尖瓣与主动脉瓣、`spleen.glb` 仅含脾结肠面。若标为「脑 / 心 / 脾」构成**科学误导** |
| `cclank/cell-architecture-studio` 细胞 GLB | 未采用 | 大型细胞模型再分发许可不明，白细胞模型约 54 MiB 不适合移动端 |
| `GordenSun/LearningCell`、`JDerekLomas/blendercell`、`QI-flowy/3DArchitectureStudio` | 未采用 | 教学素材 / 许可不明 |
| `hubmapconsortium/hra-ui` 等关系数据仓库 | 未引入代码 | 关系数据由作品自撰并标注权威来源 |
| 本地参考库 `References/design-references` 中的 GSAP / anime / lottie-web / motion / inspira-ui | 未引入运行时依赖 | 该库价值在设计与动效规范层面，不含可直接嵌入的医学三维组件；仅借鉴其动效与设计原则，未复制代码 |

完整评估记录见仓库 `docs/REFERENCE_ADOPTION.md`。

## 三、科普内容来源（19 条）

作品内每个知识条目、每道测验与解释都带来源编号（S01–S19）。完整表与可达性校验结果
见 `docs/SOURCES.md`。出版者包括：

- 国家卫生健康委员会（《中国公民健康素养——基本知识与技能（2024 年版）》）
- 世界卫生组织（身体活动 / 健康膳食 / 高血压 / 免疫接种）
- 美国国立卫生研究院：NINDS、NHLBI、NIDDK
- 美国疾病控制与预防中心
- OpenStax（莱斯大学）《Anatomy and Physiology 2e》（CC BY 4.0）
- Human Reference Atlas / HuBMAP

所有链接均于 **2026-10-14** 实际发起 HTTP 请求校验可达性；异常项（国家卫健委站点 WAF 返回 412、
NINDS 无 UA 时返回 403）在 `SOURCES.md` 中如实说明。
作品**不复制**上述来源的正文、图表或数据表，只引用结论性事实并逐条署名。

## 四、字体

不引入任何网络字体文件。展示层使用系统中文字体栈（Songti SC / Noto Serif SC /
Source Han Serif SC / STSong / Georgia），正文使用系统无衬线，标签使用等宽。
因此**不存在字体授权问题**，也不产生字体下载请求。

## 五、BodyDay 的原创贡献

以下内容由本作品独立设计实现，不是任何参考项目的二次发布：

1. 产品结构与「自由探索 / 引导教学」双模式设计；
2. 跨尺度导航模型与尺度转场语义（同模型空间连续 vs 跨模型语义连续的区分）；
3. 视觉系统：设计令牌、排版、组件、舞台版面与动效令牌；
4. 全部科普文本、健康行动说明与 8 道测验题目及其解释；
5. 科学关系数据模型（五种显式关系类型，禁止兜底关系）；
6. 引导课程状态机、交互完成判定与进度持久化；
7. **程序化神经元 / 白细胞几何**（`src/three/cellGeometry.ts`）及其取景归一化；
8. 投影式结构热点层、错误边界与三层降级策略；
9. 41 项自动化测试所表达的「不许造假」数据护栏。

## 六、科学免责声明

- BodyDay 为健康科普作品，**不构成医疗建议**，不可用于诊断、治疗或用药决策。
- 三维模型为科普示意：器官不按真实比例；细胞为程序化概括形态；结构标注点为示意位置，
  未与模型做逐点解剖配准。
- 跨尺度切换是语义连续的镜头转场，**不声称**与真实人体空间坐标严格配准。
- 个体健康状况请咨询专业医务人员。
