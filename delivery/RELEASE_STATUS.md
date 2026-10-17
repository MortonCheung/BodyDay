# BodyDay · 发布状态（RELEASE_STATUS）

> 更新时间：2026-10-15（本机时间）；**V2.1 增量订正于 2026-10-16**。本文件如实区分「已完成 / 部分完成 / 未完成」，
> 不为任何未验证的事项写「已完成」。
> 本版为 **V2 口径**：产品形态已改为「以中央唯一真实三维人体为入口的空间工作台」。
> **V2.1（2026-10-16）**：赛前最后一轮交互纠偏后，交互改为**滚轮驱动拆解**、选中为**高亮 + 其余淡化**、
> 取消选中**恢复原视角**、默认人体**中性化公开展示**；完整复现证据与读数见 `docs/v2/06_PUBLIC_PRESENTATION.md`。
> 下文凡标注「V2.1」的数字与表述，均与 V2（2026-10-15）口径区分。
> **2026-10-18 增量修订（本版）**：采用**路线 B**（保留自建三维舞台，**未**移植 Human Atlas 拆解引擎，见 `FINAL_HANDOFF_20261018.md` §1）；
> 新增**入口同节点形变**、**五项层级顶栏**、**任意可点选结构真实卡**；门禁更新为 tsc 0 / oxlint **0 error · 13 warning** / vitest **76/76** / vite build 通过（2026-10-18 实测）；
> 演示视频订正为**约 105 秒**；**🔴 远端推送结果需人工确认**（本地实测 ahead 4）。

## 1. Git 与仓库

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git`（沿用原仓库，未新建） |
| main | 已推送至提交 `aea1669`（V1「单空间工作台」版本的最终提交） |
| V2 开发分支 | `feat/bodyday-immersive-v2`（从 `main` 的 `aea1669` 起演进）；V2、**V2.1（2026-10-16）** 与 **10/18 增量**均提交到该分支（V2：`bdf738f`、`78f5044`、`9a3dbfa`、`c90be71`；V2.1：`00ecd95`、`7899bbf`、`c3df657`；10/18：`3c2e1d4`、`c06b49a`、`b014e17`，当前 HEAD = `b014e17`），**不合并 main、不 force push** |
| 远端推送状态 | 🔴 **需人工确认**：`origin/feat/bodyday-immersive-v2` 实测停在 `7899bbf`，本地 **ahead 4**（`c3df657`、`3c2e1d4`、`c06b49a`、`b014e17` 未推送）；本日推送曾被网络阻断，最终以人工 `git push origin feat/bodyday-immersive-v2` 的返回为准 |
| 回滚点 | Git 标签 `pre-1018-baseline`（`^{commit}` 实测 → `c3df657`）；`git checkout pre-1018-baseline` 只读查看，`git reset --hard pre-1018-baseline` **🔴 需人工确认** |
| 旧代码处理 | 旧「寝室 3D Demo」归档于 `body-day/src/legacy/dorm/`；V2 删除的 V1 文件保留在 Git 历史中，可随时回退 |

## 2. P0 完成度（V2 存活路径）

| 项目 | 状态 | 证据 |
|---|---|---|
| 封面闸门（真实字节进度 → 模型就绪 → 手动「进入探索」） | ✅ 完成 | `features/startup/StartupCover.tsx`、`app/AppProviders.tsx`（状态机 `loading → ready-to-enter → entering → exploring`）；进入前整个外壳处于 `inert` 且不可读屏 |
| 删双模式（自由探索 / 引导教学） | ✅ 完成 | 顶部模式开关及其状态已删除；**2026-10-18**：顶栏改为**五项层级导航（身体 / 系统 / 器官 / 细胞 / 关于）**，五项均落真实路由（实测 `navCount = 5`，`verify-entry-sheet.json`） |
| 入口同节点形变（10/18 新增） | ✅ 完成 | 同一个 `<button>` 先为 240×3 px 进度条，就绪后原地形变为 148×44 px「进入探索」，形变完成前 `disabled`；实测 `sameNode = true`（`verify-entry-sheet.json`） |
| 任意可点选结构真实卡（10/18 新增） | ✅ 完成 | 未编写科普内容的结构用图谱真实字段（结构类别 / 所属系统 / 图谱来源）出卡，字段缺失即整行不显示；**无**「尚未编入」防御句、**不再**重复挂「人体」总览卡（`src/domain/structureCard.ts` + 单测 6 项；读数见 `verify-entry-sheet.json`） |
| 删左栏（左侧常驻结构目录） | ✅ 完成 | `src/features/workbench/StructureRail.tsx` 已删除，未搬到右侧或弹窗 |
| 模型驱动点选与聚焦（点选 / 悬停 / 聚焦 / 层级栈） | ✅ 完成 | `src/three/FullBodyStage.tsx`；悬停与选中都叠加在真实材质自发光上；「返回上一级」回到上一次点选，Esc 取消选中。**V2.1（2026-10-16）**：选中是**高亮 + 其余结构淡化**（非选中结构 opacity 0.16、外壳 0.10）而非隐藏；取消选中（点空白 / Esc / 返回上一级，语义一致）**恢复选中前的相机视角**（聚焦前采集 `{position, target}` 快照）；拖动旋转不再被当成点击（原生 canvas 记录 pointerdown，位移 > 6px 一律忽略）；用户拖动时立即放弃程序化取景目标并中断 OrbitControls 阻尼惯性 | 
| 真实器官隔离（器官页 · 页面级） | ✅ 完成 | 器官页隔离网格数实测：大脑 169、心脏 4、脾脏 1。**V2.1**：人体总览的选中改为淡化（其余结构仍可见，实测点体表前后可见网格同为 967）；只有**器官页的页面级隔离**仍使用「其余结构整体收起」 |
| 拆解真实几何位移（**V2.1：滚轮驱动**） | 🟡 部分完成 | 读取 GLB `extras` 按解剖系统分层对**真实网格**做径向平移 + 体表外壳渐进隐去（实测 25% 不透明度 0.316；完全拆解「可见网格数」现证据 `capture.json`=**734**、早期文档=748，**⚠️ 不一致，🔴 需复核**）。**V2.1（2026-10-16）**：人体总览未选中结构时由**滚轮**逐层拆解 / 反向组装（每格 0.07、钳制 [0,1]；此时原生缩放关闭并在 canvas 捕获阶段拦 wheel，只作用于三维舞台，右侧知识栏滚动不受影响）；选中结构后滚轮交还 OrbitControls 观察当前结构；**桌面端不再显示拆解滑杆**（`@media (hover: hover) and (pointer: fine)` 下 `display:none`，触屏设备保留滑杆作替代）。**内部层间距仍在打磨** |
| 器官 → 细胞链路 | ✅ 完成 | 大脑→神经元（`extends_to`，按钮「进入神经元」）、脾脏→白细胞（`functional`，按钮「查看白细胞」）；心脏→白细胞只作关系说明，不作下钻入口 |
| 简化知识面板 | ✅ 完成 | **V2.1（2026-10-16）**：纸条只保留「所属系统 / 它是什么 / 它如何工作 / 与健康的关系 / 继续深入」；**删除**尺度轴、秒级时钟、层级目录（quickLinks）、重复的取消选中按钮，以及 `paperChrome.tsx`（已删除文件）；尺度切换不再有兜底跳转。来源、署名、许可仍集中在「关于」 |
| 来源归入「关于」 | ✅ 完成 | 文献编号、来源清单、许可长文统一收进 `/about`，探索界面不再展开 |
| 响应式 | 🟡 部分完成 | 390×844 视口实测无横向溢出（`scrollWidth = 390 = viewport`）；**未在真机 / 模拟器截图验收**（触屏保留拆解滑杆） |
| 模型随包发布（离线可用） | ✅ 完成 | `body-day/public/models/z-anatomy-1.4.0-full-body.glb`（31,849,556 字节）；本地加载就绪实测 0.61～1.24 秒 |
| **中性化公开展示（V2.1 新增）** | ✅ 完成 | 默认人体隐去 **17 个网格**（`reproductive` 系统 14 + 体表外壳 `Urogenital region.l/.r` 2 + `Pubic hairs` 1），可见网格 984 → **967**；**只过滤系统并不够**（外生殖器形态在体表外壳上），three 的 `GLTFLoader` 会清洗节点名（空格 / 点 → 下划线），故按归一化后比较匹配并有单测覆盖 |

## 3. 已移除的 V1 结构（改版说明）

| 旧结构 | 处置 | V2 替代 |
|---|---|---|
| 顶部「自由探索 / 引导教学」双模式开关 | **已删除** | 只保留一种探索体验：模型驱动的点选 / 聚焦 / 隔离 / 拆解 |
| 左侧常驻结构目录 `StructureRail` | **已删除** | 结构选择全部交给中央三维人体本身 |
| 右纸条内嵌引导步骤条 `GuidePanel` 与 3 个独立课程页 | **已删除用户可见入口** | 3 套引导脚本作为**内容资产**保留在 `domain/lessons.ts`（29 步 / 6 道带来源的检验题），不再作为用户必须选择的模式 |
| 封面欢迎语覆盖层 `WelcomeOverlay` | **已删除** | 独立启动封面 + 手动「进入探索」 |
| 内嵌检验题组件 `QuizBlock` | **已删除** | 检验题数据保留为内容资产 |
| 第三方查看器封装与 `AtlasStage`（`@vixotic/vanatome-react`） | **已从渲染路径移除** | 本作品自建 R3F 舞台 `FullBodyStage` |
| 临时技术验证页 `/spike-full-body`、`atlasSelection.ts` | **已删除** | 能力并入 `FullBodyStage` / `fullBody.ts` |

## 4. 技术事实

| 项 | 值 |
|---|---|
| 三维引擎 | 本作品自建 React Three Fiber 舞台（Three.js r186 + R3F 9 + Drei 10） |
| 模型读数（浏览器实测） | 984 节点 / 984 网格 / 1,746,560 三角形 / 749 个唯一 anatomyId / 64 个材质。**V2.1**：默认公开展示**中性化**后可见网格 967（隐去 17） |
| 模型分发 | 整具人体 GLB 随作品发布在 `public/models/`（31,849,556 字节）；可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本镜像；离线 / 断网也能打开 |
| 资产显式修改 | 体表 / 骨骼 / 肌肉统一到暖调（象牙 ↔ 陶土），内脏保留资产自带配色；属 CC BY-SA 4.0「标明修改」，见 `/about` 与 `public/models/ANATOMY_LICENSE.txt` |
| 门禁（2026-10-18 实测） | `tsc -b` 0 错误；oxlint 0 error / **13** warning（既有项）；vitest **76/76**（`structureCard` 6 + `domain` 22 + `fullBody` 29 + `cellGeometry` 19）；`vite build` 通过（主包 333.90 kB、三维运行时 928.08 kB、FullBodyStage 85.44 kB、CellStage 11.16 kB、样式 30.17 kB） |

## 5. 赛事材料

| 材料 | 状态 | 位置 |
|---|---|---|
| H5 页面（≥10 页） | ✅ 11 页全部可独立直达（实测） | `delivery/H5_PAGE_INDEX.md` + `delivery/test-evidence/screenshots/` |
| 源程序（可安装/构建/启动） | ✅ 完成 | `body-day/`；`delivery/source/` 与 `source-archive.zip`（由脚本重新生成） |
| 作品开发文档（附件 1-5） | ✅ 完成 | `delivery/docs/作品开发文档.md`（源）+ `delivery/docs/作品开发文档.docx` |
| 演示视频（≤8 分钟） | ✅ **已重录** | `delivery/demo/bodyday-v2-walkthrough.mp4`（**约 105 秒**，`ffprobe` 实测 105.4 s，1440×900，H.264，真实浏览器录制；⚠️ 旧文档所写「81 秒」为过期说法，已订正；软件渲染下成片不够流畅，建议真机 GPU 重录） |
| 第三方版权说明 | ✅ 完成 | `body-day/THIRD_PARTY_NOTICES.md`、`delivery/LICENSE_AND_CREDITS.md` |
| 来源与可达性校验 | ✅ 完成 | `delivery/docs/SOURCES.md`（19 条，2026-10-14 实测） |
| 参考采纳记录 | ✅ 完成 | `docs/REFERENCE_ADOPTION.md` |
| 基线勘察 | ✅ 完成 | `docs/BASELINE_AND_REFERENCES.md`、`docs/v2/`（V2 设计与验收记录） |

## 6. 必须由人工完成的事项（本 Agent 不代为执行，也不声称已完成）

1. **学校审核推荐**：按赛事要求由学校办理汇总、盖章与邮寄。🔴
2. **平台报名与作品提交**：网络平台报名及提交截止 **2026-10-18**，需人工登录提交。
   BodyDay 未在任何平台提交，也未声称已提交。🔴
3. **演示视频**：`delivery/demo/bodyday-v2-walkthrough.mp4`（**约 105 秒**）；如评审或平台需要更高规格版本，可依 `delivery/demo/DEMO_VIDEO_SCRIPT.md` 在装有真实 GPU 的机器上重录 / 补录。🔴（确认 ≤8 分钟）
4. **《作品开发文档》复核**：`.docx` 已生成，请在 Word / WPS Office 中确认排版与截图、**无错版**。🔴
5. **移动端真机验收**：建议在 iOS Safari 与 Android Chrome 上各走一遍。
6. **就「作品此前在 GitHub 公开」一事向校赛负责人核实**：比赛总通知要求作品未公开发表，本仓库曾公开可访问；**转为私有不消除「曾公开」的事实，不得声明「作品从未公开」**。🔴
7. **确认远端推送结果**：`origin/feat/bodyday-immersive-v2` 实测停在 `7899bbf`，本地 **ahead 4**；最终以人工 `git push origin feat/bodyday-immersive-v2` 的返回为准。🔴

## 7. 交付包

| 内容 | 路径 |
|---|---|
| 交付总索引 | `delivery/README_DELIVERY.md` |
| 页面索引与截图 | `delivery/H5_PAGE_INDEX.md` + `delivery/test-evidence/screenshots/` |
| 开发文档（Markdown + Word） | `delivery/docs/作品开发文档.md` / `.docx` |
| 架构 / 测试 | `delivery/docs/ARCHITECTURE.md`、`delivery/TEST_REPORT.md` |
| 权利与来源说明 | `delivery/LICENSE_AND_CREDITS.md`、`delivery/docs/SOURCES.md` |
| 演示视频 | `delivery/demo/bodyday-v2-walkthrough.mp4` |
| 演示视频分镜（重录 / 补录用） | `delivery/demo/DEMO_VIDEO_SCRIPT.md` |
| 测试证据 | `delivery/test-evidence/` |
| 发布状态（本文件副本） | `delivery/RELEASE_STATUS.md` |
| 交付检查清单 | `delivery/DELIVERY_CHECKLIST.md` |
| **交付交接主文档（10/18）** | `delivery/FINAL_HANDOFF_20261018.md` |

> 源码包 = 可运行工程本体（含 `public/models` 下的解剖模型、配置、依赖说明）；
> 比赛交付包 = 源码包 + 《作品开发文档》+ 截图 + 演示视频 + 作品说明 + 版权与科学来源材料；
> **两者不要混为一个压缩包。**

## 8. 已知限制（与 TEST_REPORT 一致，不重复展开）

**🔴 真实二维平面打包（planar packing）未实现（重要）**：本作品的「展开」是**真实几何按解剖系统的分层径向分离**，
**不是** Human Atlas 那种「投影到同一前视平面、行列打包」的平面展开；手册要求的「平面排列、避免重叠」**不成立**，
**交付材料中不得宣称**具备该能力（本次采用**路线 B**，见 `FINAL_HANDOFF_20261018.md` §1）。

三维模型为科普示意、不按真实比例；「拆解」是按解剖系统分层向外平移并渐进隐去体表外壳的示意量，
不代表器官在体内会彼此远离，也不代表真实的空间分离距离（已写入 `/about` 的科学免责声明）。
移动端只在浏览器视口（390×844）下检查过响应式，**未在真机 / 模拟器截图验收**（触屏保留拆解滑杆）；
真实 GPU 帧率未采集（自动化验收跑在 SwiftShader 软件渲染下），**不给出任何 FPS**；
拆解的产品级视觉分离仍在打磨（内部层间距可继续加大）。
**V2.1（2026-10-16）仍未解决**：未做连续跨尺度转场（现为「镜头推进 + 明确的继续深入入口」，不声称 GLB 能连续放大到细胞级）；
肾 / 膀胱本轮未新增专题（真实模型里 `urinary` 仅 3 个网格，只保留基础展示）；
中性化是**中性化展示**、不是新建一套无性征人体，骨盆近观时会看到该处被移除外壳后露出的真实肌肉 / 骨盆结构
（解剖切口观感，已如实记录，未用遮挡物掩盖）；作品**尚未在任何平台提交**（截止 2026-10-18）。
