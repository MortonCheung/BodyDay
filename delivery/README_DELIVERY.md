# BodyDay · 交付内容总索引（README_DELIVERY）

> 作品：**BodyDay · 身体的一天**｜2026 辽宁省大学生科普设计大赛 · 非医类健康科普赛道 · 第 4 组
> 交付时间：2026-10-15（本机时间）
> 本索引只列出**实际存在**的文件；不存在的材料在本文件与 `RELEASE_STATUS.md` 中明确标注为未完成。
> 本版为 **V2 口径**：产品形态是「以中央唯一真实三维人体为入口的空间工作台」，
> 人体模型随作品发布（本地加载，离线可跑）。

## 1. 目录结构

```
delivery/
  README_DELIVERY.md            交付内容总索引（本文件）
  H5_PAGE_INDEX.md              11 个页面清单、逐页实测数据与截图索引
  RELEASE_STATUS.md             P0 完成度、未完成项、必须人工处理的事项
  TEST_REPORT.md                四道门禁真实输出 + 65 项单测明细 + 11 页浏览器验收与交互实测
  FINAL_DELIVERY_REPORT.md      最终交付报告（完成情况、验证结果、交付物位置、14 张截图索引）
  LICENSE_AND_CREDITS.md        第三方资源、许可、署名与原创性声明
  DELIVERY_CHECKLIST.md         提交前检查清单（含未完成项区块与学校/平台人工环节）
  demo/
    bodyday-v2-walkthrough.mp4  体验录像（1440×900，H.264，真实浏览器连续录制）
    DEMO_VIDEO_SCRIPT.md        演示视频分镜、口播文本、录制检查清单（重录 / 补录用）
  docs/
    ARCHITECTURE.md             架构说明（与工程内 body-day/docs/ARCHITECTURE.md 对应）
    作品开发文档.md             赛事《作品开发文档》正文（Markdown 源）
    作品开发文档.docx           由上述 Markdown 生成的 Word 版
    SOURCES.md                  来源清单与可达性校验（19 条）
  test-evidence/
    screenshots/                14 张真实运行截图（桌面 1440×900，移动端 390×844）
    verify-v2.json              真实浏览器验收脚本的输出
  source/                       源码包（可运行工程本体，含 public/models 下的解剖模型；不含 node_modules 与 dist）
  source-archive.zip            源码包压缩文件
```

> 仓库根下另有赛事材料与基线文档 `docs/BASELINE_AND_REFERENCES.md`、`docs/REFERENCE_ADOPTION.md`，
> 以及 V2 设计与验收记录 `docs/v2/`。

## 2. 两个交付口径（不要混为一个压缩包）

- **源码包** = 可运行工程本体（仓库中的 `body-day/`）。**含** `public/models/` 下的整具人体解剖模型
  （`z-anatomy-1.4.0-full-body.glb`，CC BY-SA 4.0）、构建脚本、配置与依赖说明；
  **排除** `node_modules`、`dist/` 构建缓存与编辑器临时文件。交付包内以 `source/` 与 `source-archive.zip` 提供。
- **比赛交付包** = 源码包 **+** 《作品开发文档》（`.md` + `.docx`）**+** 14 张真实截图 **+** 演示视频
  （`demo/bodyday-v2-walkthrough.mp4`）**+** 作品说明 **+** 版权与科学来源材料
  （`LICENSE_AND_CREDITS.md`、`docs/SOURCES.md`）。
- **两者用途不同**：源码包供评审复现工程；比赛交付包用于平台提交。**不要把两者混为一个巨大压缩包。**

## 3. 作品入口与运行

| 项 | 值 |
|---|---|
| 源码目录 | `body-day/`（交付包内 `source/` 为其打包） |
| 运行方式 | `npm ci && npm run dev`，默认 http://localhost:5173/ |
| 生产构建 | `npm run build`（`tsc -b && vite build`），产物 `dist/` |
| 静态部署 | `dist/` 为纯静态文件，HashRouter 无需服务端重写规则 |
| 模型 | 随包发布在 `public/models/`，**离线 / 断网也能运行**；`VITE_BODYDAY_ATLAS_URL` 可指向同版本镜像 |
| 在线地址 | **无**。本作品未部署到公网，也未声称已上线；如需在线演示请按上表自行部署 |

## 4. 赛事材料对照

| 赛事要求 | 交付物 | 状态 |
|---|---|---|
| H5 页面 ≥ 10 页（含封面封底），≤ 20 页 | `H5_PAGE_INDEX.md`（11 页）+ `test-evidence/screenshots/`（14 张） | ✅ 11 页全部实测可访问 |
| 能正确显示的网址链接 | 见 §3「运行方式」；HashRouter 保证直接粘贴与刷新可用 | ✅ 本地与静态部署均可 |
| 源程序 | `source/`、`source-archive.zip`（含 `public/models` 下的解剖模型） | ✅ 可安装、可构建、可启动 |
| ≤ 8 分钟演示视频 | `demo/bodyday-v2-walkthrough.mp4`（分镜见 `demo/DEMO_VIDEO_SCRIPT.md`） | ✅ **已录制**（真实浏览器连续录制） |
| 附件 1-5《作品开发文档》 | `docs/作品开发文档.md`（源）+ `docs/作品开发文档.docx` | ✅ 两种格式均已生成 |
| 第三方版权说明 | `LICENSE_AND_CREDITS.md` | ✅ 含具体许可、署名义务与再分发条款 |

## 5. 一句话说明作品是什么

BodyDay 是一件**跨尺度**的交互式健康科普作品：中央始终是**同一具可以转动的真实三维人体**，
右侧是随选中联动的知识纸条；用户点模型上的结构即可聚焦、隔离、逐层拆解，
人体 → 系统 → 器官 → 细胞之间的差别只体现为**镜头与纸条内容的变化**。
所有科学关系都写明类型与依据，作品明确拒绝「所有器官 → 任意细胞」的兜底关系。

## 6. 必须由人工完成的事项

1. 学校汇总、盖章与邮寄（赛事要求的审核推荐环节）。
2. 网络平台报名与作品提交（截止 2026-10-18）。**BodyDay 未在任何平台提交。**
3. 如需更高规格演示视频，按 `demo/DEMO_VIDEO_SCRIPT.md` 在真实 GPU 环境重录 / 补录。
4. 移动端真机走查（iOS Safari / Android Chrome 各走一遍）。
5. 《作品开发文档》`.docx` 在 Word / WPS 中确认排版。

详见 `DELIVERY_CHECKLIST.md`。
