# BodyDay · 发布状态（RELEASE_STATUS）

> 更新时间：2026-10-15（本机时间）。本文件如实区分「已完成 / 部分完成 / 未完成」，
> 不为任何未验证的事项写「已完成」。

## 1. Git 与仓库

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git`（沿用原仓库，未新建） |
| 分支 | `main`（在原有历史上演进；与 `origin/main` 同步于 `1da523a`） |
| 本次改版 | 空间工作台改版与交付文档更新当前为**工作区未提交改动**，本 Agent 未提交、未推送 |
| 旧代码处理 | 旧「寝室 3D Demo」以 `git mv` 归档至 `body-day/src/legacy/dorm/`，保留 Git 可追溯性，不在新应用入口中出现 |

## 2. P0 功能（单工作台 + 跨尺度探索 + 内嵌引导教学）

| 功能 | 状态 | 证据 |
|---|---|---|
| 空间工作台：中央同一具三维人体 + 左右两条独立滚动纸条 | ✅ 完成 | `src/features/workbench/`；11 页共用 |
| 路由不拆分组件树，三维场景全程挂载 | ✅ 完成 | `src/app/resolveView.ts`、`AppShell.tsx`；切换页面不重挂场景（实测） |
| 人体层：完整人体 + 11 系统按需加载 + 系统切换 | ✅ 完成 | `#/body`、`#/systems/:id` 截图；实测单 canvas |
| 人体可旋转 / 缩放 / 选择 / 聚焦 / 复位 | ✅ 完成 | `AtlasStage` 交互；阶段验收脚本 |
| 相机取景交给查看器（按真实网格包围盒） | ✅ 完成 | 全身 `body-shell`、系统根结构、器官 `cerebrum`/`heart`/`spleen` 取景正确 |
| 器官层：脑 / 心 / 脾独立取景 + 结构知识 + 健康关联 | ✅ 完成 | `#/organ/*` 三页截图，器官形态清晰可辨 |
| 细胞层：神经元 / 白细胞程序化几何 + 部件热点与知识联动 | ✅ 完成 | `#/cell/*` 两页截图；热标 4 / 3；19 项几何测试 |
| 左栏结构折叠 + 内部 ID 不展示 | ✅ 完成 | `ExploreWorkbench.readableStructureName`；`body-shell` 等不出现于界面 |
| 跨尺度导航 + 右纸条尺度轴指示 | ✅ 完成 | `paperChrome.ScaleLine`；由镜头运动表达尺度变化 |
| 完整链路 A：人体 → 大脑 → 神经元 → 树突/轴突/髓鞘 → 返回 | ✅ 完成 | 神经类引导脚本 10 步 + 检验题 |
| 完整链路 B：人体 → 脾脏 → 白细胞 → 返回 | ✅ 完成 | 免疫类引导脚本 10 步 + 检验题 |
| 循环功能关联（心脏 ↔ 白细胞，标注为「循环输送」） | ✅ 完成 | `relations.ts`；自动化测试断言关系类型 |
| 自由探索与引导教学共用同一工作台与三维场景 | ✅ 完成 | 顶部模式开关 + 右纸条内嵌引导面板 |
| ≥3 套引导脚本 + 有效检验题，反馈含来源 | ✅ 完成 | 3 套脚本 / 29 步 / 6 道检验题，均带解释与来源编号 |
| 封面 = 工作台 + 欢迎语覆盖层（无「开始 / 跳过」按钮） | ✅ 完成 | `WelcomeOverlay.tsx` |
| 加载 / 错误 / 重试 / 不可用状态；切系统时「正在切换解剖图层」提示 | ✅ 完成 | `AtlasStage`、`StageBoundary`、`QuizBlock` |
| 移动端操作 | 🟡 部分完成 | 响应式布局已实现并在浏览器检查；**未在真机截图验收** |
| 减弱动态偏好 | ✅ 完成 | 全站令牌 + `motionDuration()`；转场降级为瞬时 |
| 中文主界面 | ✅ 完成 | 全部界面文案中文 |

## 3. 已移除的旧结构（改版说明）

| 旧结构 | 处置 | 替代 |
|---|---|---|
| 全屏「尺度遮罩」`ScaleVeil` | **已删除** | 右纸条上的「尺度轴」指示 + 镜头运动本身 |
| 3 个独立课程页 | **已删除** | 右纸条顶部的步骤引导（`GuidePanel`） |
| 「使用向导」页 | **已删除** | 封面欢迎语覆盖层 + 左栏直接操作 |
| 「科学关系图」页 | **已删除** | 右纸条「与其它结构的关系」区块（随选中联动） |
| 「学习总结」页 | **已删除** | 结构选中即时反馈 + localStorage 记录 |

## 4. P1 功能

| 功能 | 状态 |
|---|---|
| 内容来源与术语解释 | ✅ 完成（19 条来源表 + 知识卡附来源编号） |
| 学习进度与已发现结构记录 | ✅ 完成（localStorage，可清空） |
| 全局搜索（本地离线索引） | ❌ 未实现 |
| 模型对比 | ❌ 未实现（仅在有真实对应资产时才做） |

## 5. 赛事材料

| 材料 | 状态 | 位置 |
|---|---|---|
| H5 页面（≥10 页） | ✅ 11 页全部可访问（实测） | `delivery/H5_PAGE_INDEX.md` + `docs/screenshots/` |
| 源程序（可安装/构建/启动） | ✅ 完成 | `body-day/`；`delivery/source/` 与 `source-archive.zip` |
| 作品开发文档（附件 1-5） | ✅ 完成 | `delivery/docs/作品开发文档.md`（源）+ `delivery/docs/作品开发文档.docx` |
| 演示视频（≤8 分钟） | ❌ **未录制** | `delivery/demo/DEMO_VIDEO_SCRIPT.md`（分镜 + 口播 + 检查清单） |
| 第三方版权说明 | ✅ 完成 | `body-day/THIRD_PARTY_NOTICES.md`、`delivery/LICENSE_AND_CREDITS.md` |
| 来源与可达性校验 | ✅ 完成 | `delivery/docs/SOURCES.md`（19 条，2026-10-14 实测） |
| 参考采纳记录 | ✅ 完成 | `docs/REFERENCE_ADOPTION.md` |
| 基线勘察 | ✅ 完成 | `docs/BASELINE_AND_REFERENCES.md` |

## 6. 必须由人工完成的事项（本 Agent 不代为执行，也不声称已完成）

1. **学校审核推荐**：按赛事要求由学校办理汇总、盖章与邮寄。
2. **平台报名与作品提交**：网络平台报名及提交截止 **2026-10-18**，需人工登录提交。
   BodyDay 未在任何平台提交，也未声称已提交。
3. **演示视频录制**：需在装有真实 GPU 的机器上按 `delivery/demo/DEMO_VIDEO_SCRIPT.md` 录制。
4. **《作品开发文档》复核**：`.docx` 已生成，请在 Word / WPS Office 中确认排版与截图。
5. **移动端真机验收**：建议在 iOS Safari 与 Android Chrome 上各走一遍。

## 7. 交付包

| 内容 | 路径 |
|---|---|
| 交付总索引 | `delivery/README_DELIVERY.md` |
| 页面索引与截图 | `delivery/H5_PAGE_INDEX.md` + `docs/screenshots/` |
| 开发文档（Markdown + Word） | `delivery/docs/作品开发文档.md` / `.docx` |
| 架构 / 测试 | `delivery/docs/ARCHITECTURE.md`、`delivery/TEST_REPORT.md` |
| 权利与来源说明 | `delivery/LICENSE_AND_CREDITS.md`、`delivery/docs/SOURCES.md` |
| 测试证据 | `delivery/test-evidence/` |
| 发布状态（本文件副本） | `delivery/RELEASE_STATUS.md` |
| 演示视频分镜 | `delivery/demo/DEMO_VIDEO_SCRIPT.md` |
| 交付检查清单 | `delivery/DELIVERY_CHECKLIST.md` |

> 源码包不包含 `node_modules`、构建缓存、编辑器临时文件与任何未经许可的第三方模型文件。

## 8. 已知限制（与 TEST_REPORT 一致，不重复展开）

三维模型为科普示意、不按真实比例；取景由查看器按真实网格包围盒计算，是**有意选定的锚点**而非解剖配准；
细胞模型为程序化原创几何；素材从官方 CDN 按需加载，网络不稳定时偶发单次分片加载失败（内置重试与镜像开关）；
性能数据因软件渲染环境未采集；演示视频未录制；移动端未真机验收。
