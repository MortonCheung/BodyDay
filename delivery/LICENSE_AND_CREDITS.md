# BodyDay · 权利与来源说明（LICENSE_AND_CREDITS）

> 本文件面向赛事评审，说明作品使用了哪些第三方资源、各自许可、署名义务，
> 以及哪些部分是 BodyDay 的原创贡献。**不含任何许可不明的资源。**
> 本轮为 **V2 口径**：整具人体模型随作品一起发布，人体 / 器官层改由本作品自建舞台渲染。

## 一、运行时第三方依赖

| 包 | 许可 | 用途 |
|---|---|---|
| React / React DOM 19 | MIT | UI 运行时 |
| react-router-dom 7 | MIT | 路由（HashRouter） |
| three 0.186 | MIT | WebGL 渲染 |
| @react-three/fiber 9 | MIT | React 渲染器 |
| @react-three/drei 10 | MIT | OrbitControls 与 GLTF 加载等辅助组件 |

> V2 已从渲染路径**移除第三方查看器封装** `@vixotic/vanatome-react` 与其 atlas 加载器
> `@vixotic/vanatome-atlas`：人体 / 器官层改由本作品自建的 React Three Fiber 舞台 `FullBodyStage`
> 直接渲染同一个整具人体 GLB，从而可以拿到真实网格并逐组位移做拆解。二者仍以 MIT 许可保留在
> `package.json` 的依赖声明中，但已无任何代码引用。

开发期依赖（vite / typescript / oxlint / vitest）不进入交付产物。

## 二、解剖模型与图谱资产

### 2.1 人体与器官三维模型

- **来源**：Z-Anatomy — The libre 3D atlas of anatomy（https://github.com/Z-Anatomy/Models），
  经 **Vanatome Human Atlas 1.4.0**（https://github.com/vixotic/Vanatome）导出为 Web 版本。
- **原始贡献者**：Gauthier Kervyn（设计 / 三维 / 解剖）、Marcin Zielinski（Python 脚本），
  以及 Z-Anatomy 项目记录的其他贡献者与上游来源。
- **许可**：**CC BY-SA 4.0**（https://creativecommons.org/licenses/by-sa/4.0/）。代码部分为 MIT。
- **署名文本（作品内「关于」页可见）**：
  > 人体与器官解剖模型：Z-Anatomy（CC BY-SA 4.0），经 Vanatome 导出为 Web 版本。
- **随包发布**：整具人体 GLB 位于 `body-day/public/models/z-anatomy-1.4.0-full-body.glb`
  （**31,849,556 字节**），**随作品一起发布**，运行时不再依赖外链 CDN；
  离线 / 断网也能正常打开。可用环境变量 `VITE_BODYDAY_ATLAS_URL` 指向同版本镜像。
- **BodyDay 对这一素材的修改（须声明）**：
  1. 结构 ID → 作品实体 ID 的映射层；
  2. 按解剖系统的结构分组与**真实几何径向位移**（拆解），位移量随进度重算、从不累加；
  3. 体表外壳随拆解进度**渐进隐去**；
  4. 系统级可见性过滤（只显示某一个解剖系统）；
  5. 选中 / 悬停叠加在真实材质自发光上的高亮，以及按真实包围盒的取景；
  6. **体表 / 骨骼 / 肌肉三个系统统一到暖调（象牙 ↔ 陶土）**，内脏保留资产自带的真实解剖配色；
  7. 自建 R3F 舞台的加载与生命周期管理。
- **再分发义务**：若分发本作品的适配版本，须保留署名、标明修改、附许可链接，
  并以**相同方式共享**。许可全文见 `body-day/public/models/ANATOMY_LICENSE.txt`。

### 2.2 已评估但未采用的资源

| 资源 | 结论 | 原因 |
|---|---|---|
| Human Atlas（Vanatome 之外的整库） | 未采用 | 会带来第二套引擎、第二套资产与第二套 ID 体系：其 three 版本较旧（^0.159）、非 R3F、仓库体量约 154 MB，并采用另一套结构 ID。改用同源的 `curated-full-body` 单文件整具人体 + 自建舞台，可复用同一套资产、许可与 ID 体系 |
| `HongChao6/open-anatomy-studio` 的 `public/models/*.glb`（HRA / HuBMAP，CC BY 4.0） | 未采用 | 实测其内容为**局部解剖参照**：`brain.glb` 仅含嗅球与视交叉、`heart.glb` 仅含二尖瓣与主动脉瓣、`spleen.glb` 仅含脾结肠面。若标为「脑 / 心 / 脾」构成**科学误导** |
| `cclank/cell-architecture-studio` 细胞 GLB | 未采用 | 大型细胞模型再分发许可不明，白细胞模型约 54 MiB 不适合移动端 |
| `GordenSun/LearningCell`、`JDerekLomas/blendercell`、`QI-flowy/3DArchitectureStudio` | 未采用 | 教学素材 / 许可不明 |
| `hubmapconsortium/hra-ui` 等关系数据仓库 | 未引入代码 | 关系数据由作品自撰并标注权威来源 |
| 本地参考库 `References/design-references` 中的 GSAP / anime / lottie-web / motion / inspira-ui | 未引入运行时依赖 | 该库价值在设计与动效规范层面，不含可直接嵌入的医学三维组件；仅借鉴其动效与设计原则，未复制代码 |

完整评估记录见仓库 `docs/REFERENCE_ADOPTION.md`。

## 三、科普内容来源（19 条）

作品内每道测验与解释都带来源编号（S01–S19）。完整表与可达性校验结果
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

> V2 把来源编号与许可长文统一收进作品的「关于 · 数据与方法」页；
> **移除展示不等于删除依据** —— 知识与来源的映射、第三方许可与署名、免责声明全部保留。

## 四、字体

不引入任何网络字体文件。展示层使用系统中文字体栈（Songti SC / Noto Serif SC /
Source Han Serif SC / STSong / Georgia），正文使用系统无衬线，标签使用等宽。
因此**不存在字体授权问题**，也不产生字体下载请求。

## 五、BodyDay 的原创贡献

以下内容由本作品独立设计实现，不是任何参考项目的二次发布：

1. 产品形态：**以中央真实三维人体为唯一入口的空间工作台**（启动封面闸门 → 模型驱动的点选 /
   聚焦 / 隔离 / 逐层拆解 → 从器官下潜到细胞），以及「返回上一级」的层级栈；
2. 启门闸门状态机与**真实字节进度**的就绪契约（`loading → ready-to-enter → entering → exploring`）；
3. 跨尺度导航模型与尺度语义（同模型空间连续 vs 跨模型语义连续的区分）；
4. 视觉系统：设计令牌、排版、组件、舞台版面与动效令牌，以及暖白纸面的统一视觉语言；
5. 全部科普文本、健康行动说明与 **6 道检验题及其解释**（3 套跨尺度脚本共 29 步，
   作为**内容资产**保留在 `domain/lessons.ts`）；
6. 科学关系数据模型（**5 种显式关系类型、共 14 条关系**，禁止兜底关系）；
7. **拆解的真实几何位移算法**（读取 GLB 的 `extras` / `userData` 得到 `anatomyId` 与所属系统，
   按解剖系统分层对真实网格位置做径向平移，配合体表外壳渐进隐去；位移按进度重算、从不累加）；
8. **程序化神经元 / 白细胞几何**（`src/three/cellGeometry.ts`）及其取景归一化；
9. 细胞页的投影式结构热点层、错误边界与舞台三层降级策略；
10. **65 项自动化测试**所表达的「不许造假」数据护栏。

## 六、科学免责声明

- BodyDay 为健康科普作品，**不构成医疗建议**，不可用于诊断、治疗或用药决策。
- 三维模型为科普示意：器官不按真实比例；细胞为程序化概括形态；结构标注点为示意位置，
  未与模型做逐点解剖配准。
- 「拆解」是把**真实几何**按解剖系统分层向外平移、并随进度渐进隐去体表外壳的结果，
  用于说明人体由哪些结构组成；平移距离是为看清结构而放大的示意量，
  **不代表器官在体内会彼此远离，也不代表真实的空间分离距离**。
- 跨尺度切换是语义连续的镜头转场，**不声称**与真实人体空间坐标严格配准。
- 个体健康状况请咨询专业医务人员。

## 七、分发策略（源码包 vs 比赛交付包）

- **源码包** = 可运行工程本体，**含** `public/models/` 下的原生解剖模型 GLB、构建配置与依赖说明；
  原生 GLB 与源码可随包分发（CC BY-SA 4.0 允许再分发，须履行署名、标明修改与相同方式共享）。
- **比赛交付包** = 源码包 + 《作品开发文档》+ 截图 + 演示视频 + 作品说明 + 版权与科学来源材料，
  按平台要求组织。
- **两者不要混为一个压缩包。** 源码包不包含 `node_modules`、构建缓存、编辑器临时文件与任何许可不明的第三方模型。
