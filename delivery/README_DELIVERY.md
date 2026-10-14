# BodyDay · 交付内容总索引（README_DELIVERY）

> 作品：**BodyDay · 身体的一天**｜2026 辽宁省大学生科普设计大赛 · 非医类健康科普赛道 · 第 4 组
> 交付时间：2026-10-15（本机时间）
> 本索引只列出**实际存在**的文件；不存在的材料在本文件与 `RELEASE_STATUS.md` 中明确标注为未完成。

## 1. 目录结构

```
delivery/
  README_DELIVERY.md            交付内容总索引（本文件）
  H5_PAGE_INDEX.md              15 个页面清单、逐页实测数据与截图索引
  RELEASE_STATUS.md             P0/P1 完成度、未完成项、必须人工处理的事项
  TEST_REPORT.md                门禁命令真实输出 + 41 项单测明细 + 15 页浏览器验收
  LICENSE_AND_CREDITS.md        第三方资源、许可、署名与原创性声明
  DELIVERY_CHECKLIST.md         提交前检查清单（含学校与平台人工环节）
  demo/
    DEMO_VIDEO_SCRIPT.md        演示视频分镜、口播文本、录制检查清单（视频未录制）
  docs/
    作品开发文档.md             附件 1-5 对应正文（Markdown 源；.docx 待排版）
  screenshots/                  15 页真实运行截图（1440×900）
  test-evidence/                测试与验收证据
  source/                       可复现源码（不含 node_modules 与缓存）
  source-archive.zip            源码压缩包
```

## 2. 作品入口与运行

| 项 | 值 |
|---|---|
| 源码目录 | `source/`（等价于仓库中的 `body-day/`） |
| 运行方式 | `npm install && npm run dev`，默认 http://localhost:5173/ |
| 生产构建 | `npm run build`（`tsc -b && vite build`），产物 `dist/` |
| 静态部署 | `dist/` 为纯静态文件，HashRouter 无需服务端重写规则 |
| 在线地址 | **无**。本作品未部署到公网，也未声称已上线；如需在线演示请按上表自行部署 |

## 3. 赛事材料对照

| 赛事要求 | 交付物 | 状态 |
|---|---|---|
| H5 页面 ≥ 10 页（含封面封底），≤ 20 页 | `H5_PAGE_INDEX.md`（15 页）+ `screenshots/` | ✅ 15 页全部实测可访问 |
| 能正确显示的网址链接 | 见 §2「运行方式」；HashRouter 保证直接粘贴与刷新可用 | ✅ 本地与静态部署均可 |
| 源程序 | `source/`、`source-archive.zip` | ✅ 可安装、可构建、可启动 |
| ≤ 8 分钟演示视频 | `demo/DEMO_VIDEO_SCRIPT.md` | ❌ **视频未录制**（脚本与分镜已就绪） |
| 附件 1-5《作品开发文档》 | `docs/作品开发文档.md` | 🟡 正文已完成；`.docx` 排版待办 |
| 第三方版权说明 | `LICENSE_AND_CREDITS.md` | ✅ 含具体许可、署名义务与再分发条款 |

## 4. 一句话说明作品是什么

BodyDay 是一件**双模式、跨尺度**的交互式健康科普作品：
从一具可以转动的完整人体出发，逐层进入系统 → 器官 → 细胞 → 细胞内部结构，
每一层都能点击、能追问、能回溯；自由探索与引导教学共用同一套模型舞台；
所有科学关系都写明类型与依据，作品明确拒绝「所有器官 → 任意细胞」的兜底关系。

## 5. 必须由人工完成的事项

1. 学校汇总、盖章与邮寄（赛事要求的审核推荐环节）。
2. 网络平台报名与作品提交（截止 2026-10-18）。**BodyDay 未在任何平台提交。**
3. 演示视频录制（需真实 GPU 环境，按 `demo/DEMO_VIDEO_SCRIPT.md` 执行）。
4. 《作品开发文档》`.docx` 按模板排版并插入真实截图。
5. 建议在 iOS Safari / Android Chrome 真机上各走一遍两条贯通路线。

详见 `DELIVERY_CHECKLIST.md`。
