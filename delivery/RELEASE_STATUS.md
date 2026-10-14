# BodyDay · 发布状态（RELEASE_STATUS）

> 更新时间：2026-10-15（本机时间）。本文件如实区分「已完成 / 部分完成 / 未完成」，
> 不为任何未验证的事项写「已完成」。

## 1. Git 与仓库

| 项 | 值 |
|---|---|
| 远端 | `https://github.com/MortonCheung/BodyDay.git`（沿用原仓库，未新建） |
| 分支 | `main`（在原有历史上演进） |
| 旧代码处理 | 旧「寝室 3D Demo」以 `git mv` 归档至 `body-day/src/legacy/dorm/`，**保留 Git 可追溯性**，不在新应用入口中出现 |
| 推送状态 | 见 `docs/FINAL_DELIVERY_REPORT.md` 中的实际 commit 记录 |

## 2. P0 功能（自由探索 + 引导教学 + 两条真实贯通路线）

| 功能 | 状态 | 证据 |
|---|---|---|
| 人体层：完整人体 + 11 系统按需加载 + 系统切换 | ✅ 完成 | `#/body`、`#/systems/:id` 截图；实测单 canvas |
| 人体可旋转 / 缩放 / 选择 / 聚焦 / 隔离 / 复位 | ✅ 完成 | `AtlasStage` 交互；阶段验收脚本 |
| 器官层：脑 / 心 / 脾独立视图 + 区域说明 + 相邻结构 | ✅ 完成 | `#/organ/*` 三页截图，器官形态清晰可辨 |
| 细胞层：神经元 / 白细胞程序化几何 + 部件热点与知识联动 | ✅ 完成 | `#/cell/*` 两页截图；热标 4 / 3；19 项几何测试 |
| 跨尺度导航 + 尺度交代转场 | ✅ 完成 | `ScaleVeil` 尺度轴；「进入细胞」按钮走统一入口 |
| 完整链路 A：人体 → 大脑 → 神经元 → 树突/轴突/髓鞘 → 返回 | ✅ 完成 | `#/lesson/neural` 10 步课程 + 测验 |
| 完整链路 B：人体 → 脾脏 → 白细胞 → 返回 | ✅ 完成 | `#/lesson/immune` 10 步课程 + 测验 |
| 循环功能关联（心脏 ↔ 白细胞，标注为「循环输送」） | ✅ 完成 | `#/lesson/circulation`；自动化测试断言关系类型 |
| 自由探索与引导教学两种模式均可进入并有闭环 | ✅ 完成 | 封面双入口 + 顶部模式切换；课程有完成判定 |
| ≥3 个科普主题 + ≥3 个有效测验情境，反馈含来源 | ✅ 完成 | 3 主题 / 8 道测验，每道带解释与来源编号 |
| 加载 / 错误 / 重试 / 不可用状态 | ✅ 完成 | `AtlasStage`、`StageBoundary`、`Unavailable`、`QuizBlock` |
| 移动端操作 | 🟡 部分完成 | 响应式为设计完成（三栏 → 单列、44px 触摸目标）；**未在真机截图验收** |
| 减弱动态偏好 | ✅ 完成 | 全站令牌 + `motionDuration()`；转场降级为瞬时 |
| 中文主界面 | ✅ 完成 | 全部界面文案中文 |

## 3. P1 功能

| 功能 | 状态 |
|---|---|
| 跨器官/细胞关系浏览（按类型筛选、跳回模型） | ✅ 完成（`#/relations`，14 条关系 / 5 种类型） |
| 学习进度与已发现结构图谱 | ✅ 完成（`#/summary`，localStorage，可清空） |
| 内容来源与术语解释 | ✅ 完成（19 条来源表 + 每条知识卡附来源编号） |
| 全局搜索（本地离线索引） | ❌ 未实现（时间不足，未伪装） |
| 模型对比 | ❌ 未实现（仅在有真实对应资产时才做；当前不做） |

## 4. 赛事材料

| 材料 | 状态 | 位置 |
|---|---|---|
| H5 页面（≥10 页） | ✅ 15 页全部可访问（实测） | `docs/H5_PAGE_INDEX.md` + `docs/screenshots/` |
| 源程序（可安装/构建/启动） | ✅ 完成 | `body-day/`；`delivery/source-archive`（见 §6） |
| 作品开发文档（附件 1-5） | 🟡 内容已完成，`.docx` 生成待办 | `delivery/docs/作品开发文档.md` |
| 演示视频（≤8 分钟） | ❌ **未录制** | `docs/DEMO_VIDEO_SCRIPT.md`（分镜 + 口播 + 检查清单） |
| 第三方版权说明 | ✅ 完成 | `body-day/THIRD_PARTY_NOTICES.md`、`delivery/LICENSE_AND_CREDITS.md` |
| 来源与可达性校验 | ✅ 完成 | `docs/SOURCES.md`（19 条，2026-10-14 实测） |
| 参考采纳记录 | ✅ 完成 | `docs/REFERENCE_ADOPTION.md` |
| 基线勘察 | ✅ 完成 | `docs/BASELINE_AND_REFERENCES.md` |

## 5. 必须由人工完成的事项（本 Agent 不代为执行，也不声称已完成）

1. **学校审核推荐**：按赛事要求由学校办理汇总、盖章与邮寄。
2. **平台报名与作品提交**：网络平台报名及提交截止 **2026-10-18**，需人工登录提交。
   BodyDay 未在任何平台提交，也未声称已提交。
3. **演示视频录制**：需在装有真实 GPU 的机器上按 `docs/DEMO_VIDEO_SCRIPT.md` 录制。
4. **《作品开发文档》`.docx` 排版**：需按模板要求（正文五号宋体、一级标题三号黑体、
   二级标题四号黑体）排版并插入真实截图。
5. **移动端真机验收**：建议在 iOS Safari 与 Android Chrome 上各走一遍两条贯通路线。

## 6. 交付包

| 内容 | 路径 |
|---|---|
| 交付总索引 | `delivery/README_DELIVERY.md` |
| 页面索引与截图 | `delivery/H5_PAGE_INDEX.md`（含截图目录） |
| 开发文档（Markdown 源） | `delivery/docs/作品开发文档.md` |
| 权利与来源说明 | `delivery/LICENSE_AND_CREDITS.md` |
| 测试证据 | `delivery/test-evidence/` |
| 发布状态（本文件副本） | `delivery/RELEASE_STATUS.md` |
| 演示视频分镜 | `delivery/demo/DEMO_VIDEO_SCRIPT.md` |
| 交付检查清单 | `delivery/DELIVERY_CHECKLIST.md` |

> 源码包不包含 `node_modules`、构建缓存、编辑器临时文件与任何未经许可的第三方模型文件。

## 7. 已知限制（与 TEST_REPORT 一致，不重复展开）

三维模型为科普示意；`position` 锚点不等于真实包围盒，器官取景距离系数为实测定标结果；
组织层以文字说明呈现，不做体渲染；性能数据因软件渲染环境未采集。
