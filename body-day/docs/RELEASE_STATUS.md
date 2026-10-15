# BodyDay · 发布状态（RELEASE_STATUS）

> 更新时间：2026-10-15（本机时间）。本文件如实区分「已完成 / 部分完成 / 未完成」，
> 不为任何未验证的事项写「已完成」。
> 本版为 **V2 口径**：产品形态已改为「以中央唯一真实三维人体为入口的空间工作台」。

## 1. Git 与仓库

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git`（沿用原仓库，未新建） |
| main | 已推送至提交 `aea1669`（V1「单空间工作台」版本的最终提交） |
| V2 开发分支 | `feat/bodyday-immersive-v2`（从 `main` 的 `aea1669` 起演进）；按阶段单独提交并推送，**不合并 main、不 force push** |
| 旧代码处理 | 旧「寝室 3D Demo」归档于 `body-day/src/legacy/dorm/`；V2 删除的 V1 文件保留在 Git 历史中，可随时回退 |

## 2. P0 完成度（V2 存活路径）

| 项目 | 状态 | 证据 |
|---|---|---|
| 封面闸门（真实字节进度 → 模型就绪 → 手动「进入探索」） | ✅ 完成 | `features/startup/StartupCover.tsx`、`app/AppProviders.tsx`（状态机 `loading → ready-to-enter → entering → exploring`）；进入前整个外壳处于 `inert` 且不可读屏 |
| 删双模式（自由探索 / 引导教学） | ✅ 完成 | 顶部模式开关及其状态已删除；顶栏只剩品牌与「关于」 |
| 删左栏（左侧常驻结构目录） | ✅ 完成 | `src/features/workbench/StructureRail.tsx` 已删除，未搬到右侧或弹窗 |
| 模型驱动点选与聚焦（点选 / 悬停 / 聚焦 / 层级栈） | ✅ 完成 | `src/three/FullBodyStage.tsx`；悬停与选中都叠加在真实材质自发光上；「返回上一级」回到上一次点选，Esc 取消选中 | 
| 真实器官隔离 | ✅ 完成 | 器官页隔离网格数实测：大脑 169、心脏 4、脾脏 1 |
| 拆解真实几何位移 | 🟡 部分完成 | 读取 GLB `extras` 按解剖系统分层对**真实网格**做径向平移 + 体表外壳渐进隐去（实测 25% 不透明度 0.316、≥40% 可见网格 984→748）；**内部层间距仍在打磨** |
| 器官 → 细胞链路 | ✅ 完成 | 大脑→神经元（`extends_to`，按钮「进入神经元」）、脾脏→白细胞（`functional`，按钮「查看白细胞」）；心脏→白细胞只作关系说明，不作下钻入口 |
| 简化知识面板 | ✅ 完成 | `KnowledgePaper.tsx` 收敛为「当前选中 / 本页主体 / 关系 / 跨尺度 / 科学边界」 |
| 来源归入「关于」 | ✅ 完成 | 文献编号、来源清单、许可长文统一收进 `/about`，探索界面不再展开 |
| 响应式 | 🟡 部分完成 | 390×844 视口实测无横向溢出（`scrollWidth = 390 = viewport`）；**未在真机 / 模拟器截图验收** |
| 模型随包发布（离线可用） | ✅ 完成 | `body-day/public/models/z-anatomy-1.4.0-full-body.glb`（31,849,556 字节）；本地加载就绪实测 0.96～1.24 秒 |

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
| 模型读数（浏览器实测） | 984 节点 / 984 网格 / 1,746,560 三角形 / 749 个唯一 anatomyId / 64 个材质 |
| 模型分发 | 整具人体 GLB 随作品发布在 `public/models/`（31,849,556 字节）；可用 `VITE_BODYDAY_ATLAS_URL` 指向同版本镜像；离线 / 断网也能打开 |
| 资产显式修改 | 体表 / 骨骼 / 肌肉统一到暖调（象牙 ↔ 陶土），内脏保留资产自带配色；属 CC BY-SA 4.0「标明修改」，见 `/about` 与 `public/models/ANATOMY_LICENSE.txt` |
| 门禁（2026-10-15） | `tsc -b` 0 错误；oxlint 0 error / 12 warning；vitest 65/65；`vite build` 成功 |

## 5. 赛事材料

| 材料 | 状态 | 位置 |
|---|---|---|
| H5 页面（≥10 页） | ✅ 11 页全部可独立直达（实测） | `delivery/H5_PAGE_INDEX.md` + `delivery/test-evidence/screenshots/` |
| 源程序（可安装/构建/启动） | ✅ 完成 | `body-day/`；`delivery/source/` 与 `source-archive.zip`（由脚本重新生成） |
| 作品开发文档（附件 1-5） | ✅ 完成 | `delivery/docs/作品开发文档.md`（源）+ `delivery/docs/作品开发文档.docx` |
| 演示视频（≤8 分钟） | ✅ **已录制** | `delivery/demo/bodyday-v2-walkthrough.mp4`（1440×900，H.264，真实浏览器录制） |
| 第三方版权说明 | ✅ 完成 | `body-day/THIRD_PARTY_NOTICES.md`、`delivery/LICENSE_AND_CREDITS.md` |
| 来源与可达性校验 | ✅ 完成 | `delivery/docs/SOURCES.md`（19 条，2026-10-14 实测） |
| 参考采纳记录 | ✅ 完成 | `docs/REFERENCE_ADOPTION.md` |
| 基线勘察 | ✅ 完成 | `docs/BASELINE_AND_REFERENCES.md`、`docs/v2/`（V2 设计与验收记录） |

## 6. 必须由人工完成的事项（本 Agent 不代为执行，也不声称已完成）

1. **学校审核推荐**：按赛事要求由学校办理汇总、盖章与邮寄。
2. **平台报名与作品提交**：网络平台报名及提交截止 **2026-10-18**，需人工登录提交。
   BodyDay 未在任何平台提交，也未声称已提交。
3. **演示视频**：已录制 mp4（`delivery/demo/bodyday-v2-walkthrough.mp4`）；如评审或平台需要更高规格版本，可依 `delivery/demo/DEMO_VIDEO_SCRIPT.md` 在装有真实 GPU 的机器上重录 / 补录。
4. **《作品开发文档》复核**：`.docx` 已生成，请在 Word / WPS Office 中确认排版与截图。
5. **移动端真机验收**：建议在 iOS Safari 与 Android Chrome 上各走一遍。

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

> 源码包 = 可运行工程本体（含 `public/models` 下的解剖模型、配置、依赖说明）；
> 比赛交付包 = 源码包 + 《作品开发文档》+ 截图 + 演示视频 + 作品说明 + 版权与科学来源材料；
> **两者不要混为一个压缩包。**

## 8. 已知限制（与 TEST_REPORT 一致，不重复展开）

三维模型为科普示意、不按真实比例；「拆解」是按解剖系统分层向外平移并渐进隐去体表外壳的示意量，
不代表器官在体内会彼此远离，也不代表真实的空间分离距离（已写入 `/about` 的科学免责声明）。
移动端只在浏览器视口（390×844）下检查过响应式，**未在真机 / 模拟器截图验收**；
真实 GPU 帧率未采集（自动化验收跑在 SwiftShader 软件渲染下），**不给出任何 FPS**；
拆解的产品级视觉分离仍在打磨（内部层间距可继续加大）；作品**尚未在任何平台提交**。
