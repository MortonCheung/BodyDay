# BodyDay · H5 页面索引与逐页截图（H5_PAGE_INDEX）

> 赛事要求 H5 交互式作品「页面不少于 10 页（含封面、封底），总页面控制在 20 页以内」。
> BodyDay 按 **11 页**交付（含封面 `/` 与封底 `/about`），每个页面都可独立直达、可单独截图。
>
> 全站采用**一个空间工作台**：中央永远是同一具三维人体（Vanatome / Z-Anatomy atlas，经
> `@vixotic/vanatome-react` 渲染），左右两侧是两条独立滚动的纸条面板。
> **除封底外，10 个探索页共用同一个工作台组件与同一套左右纸条**；封底 `/about` 是独立阅读页面。
> 人体 → 系统 → 器官 → 细胞之间的差别，只体现为**镜头位置与两侧面板内容的变化**，不换页面外壳、不重挂三维场景。
>
> 全部截图由 Playwright（headless + SwiftShader 软件渲染）在 **1440×900** 视口下对**真实运行的开发服务器**抓取，
> 路径见 `docs/screenshots/`（11 张，命名 `01-cover.png` … `11-about.png`），
> 并复制到 `delivery/test-evidence/screenshots/`。抓取时间：2026-10-15（本机时间）。

## 1. 页面清单与实测数据

| 序号 | 标题 | 路径 | 尺度 | 实测 canvas | 3D 热标 | 截图 |
|---|---|---|---|---|---|---|
| 01 | 封面 · 身体的一天 | `#/` | 人体 | 1 | — | [01-cover.png](./test-evidence/screenshots/01-cover.png) |
| 02 | 人体总览 | `#/body` | 人体 | 1 | — | [02-body.png](./test-evidence/screenshots/02-body.png) |
| 03 | 神经系统 | `#/systems/nervous-system` | 系统 | 1 | — | [03-system-nervous.png](./test-evidence/screenshots/03-system-nervous.png) |
| 04 | 循环系统 | `#/systems/cardiovascular-system` | 系统 | 1 | — | [04-system-cardiovascular.png](./test-evidence/screenshots/04-system-cardiovascular.png) |
| 05 | 淋巴系统 | `#/systems/lymphatic-system` | 系统 | 1 | — | [05-system-lymphatic.png](./test-evidence/screenshots/05-system-lymphatic.png) |
| 06 | 大脑 | `#/organ/brain` | 器官 | 1 | — | [06-organ-brain.png](./test-evidence/screenshots/06-organ-brain.png) |
| 07 | 心脏 | `#/organ/heart` | 器官 | 1 | — | [07-organ-heart.png](./test-evidence/screenshots/07-organ-heart.png) |
| 08 | 脾脏 | `#/organ/spleen` | 器官 | 1 | — | [08-organ-spleen.png](./test-evidence/screenshots/08-organ-spleen.png) |
| 09 | 神经元 | `#/cell/neuron` | 细胞 | 1 | **4** | [09-cell-neuron.png](./test-evidence/screenshots/09-cell-neuron.png) |
| 10 | 白细胞 | `#/cell/leukocyte` | 细胞 | 1 | **3** | [10-cell-leukocyte.png](./test-evidence/screenshots/10-cell-leukocyte.png) |
| 11 | 关于 · 数据与方法 | `#/about` | — | **0** | — | [11-about.png](./test-evidence/screenshots/11-about.png) |

**实测结论：11/11 页全部可达并完成渲染，控制台 error 与 pageerror 数量为 0。**

- 10 个探索页活跃 Canvas 均为 **1**（同一时刻单活跃 WebGL 场景；封面第一帧起就是真实三维场景）；
- 封底 `/about` 为 **0**（不加载 three.js，首屏不承担三维体积）；
- 神经元页 4 个 DOM 热标（胞体 / 树突 / 轴突 / 髓鞘），白细胞页 3 个（细胞膜 / 细胞质 / 细胞核）；
- 系统页切换时会重新加载对应 atlas bundle，但已装配过的查看器保持挂载，只在画面上给一条「正在切换解剖图层」的提示。

## 2. 逐页「该页能做什么」

| 序号 | 该页能做什么 |
|---|---|
| 01 封面 | 第一帧即真实人体三维场景 + 一层「欢迎语文字覆盖层」（`pointer-events: none`，模型就绪后约 2.4 秒自然淡出，冷启动最迟 9 秒淡出；**没有「开始 / 跳过」按钮**）。可以立即转动模型、点选结构。 |
| 02 人体总览 | 转动完整人体；左栏列出解剖系统目录与本图层可聚焦的真实结构；点模型上的结构，右纸条「当前选中」随之更新。 |
| 03 神经系统 | 在人体中单独显示神经系统并聚焦（镜头由查看器按真实网格包围盒计算）；左栏列出该系统的真实结构并可点选聚焦；尺度轴标记为「系统」。 |
| 04 循环系统 | 同神经系统页：单独显示循环系统、聚焦、结构点选；右栏给出循环系统简介与结构知识。 |
| 05 淋巴系统 | 同神经系统页：单独显示淋巴系统、聚焦、结构点选。 |
| 06 大脑 | 镜头聚焦大脑（`cerebrum`），其余结构隐藏便于观察；右栏给出脑的结构知识、健康关联，以及向下进入神经元的入口。 |
| 07 心脏 | 镜头聚焦心脏，右栏说明四腔 / 瓣膜 / 循环功能，并澄清「心脏 — 白细胞」是循环输送关系（心脏不生成白细胞）。 |
| 08 脾脏 | 镜头聚焦脾脏，右栏说明淋巴器官的免疫角色与血液过滤功能，以及向下进入白细胞的入口。 |
| 09 神经元 | 细胞层程序化原创几何：胞体 / 树突 / 轴突 / 髓鞘，4 个可点热标与左栏部件列表，点部件右栏知识联动。 |
| 10 白细胞 | 细胞层程序化原创几何：细胞膜 / 细胞质 / 细胞核，3 个可点热标，并说明白细胞主要生成于骨髓。 |
| 11 关于 · 数据与方法 | 作品定位、结构化数据规模、完整来源表（19 条，含访问日期与实测可达性）、第三方许可与版权、科学免责声明、11 页页面索引表。可打开原始来源链接、回到任意入口。 |

> 「3D 热标」为细胞页在默认机位下投影到画面上的 DOM 标注数量，由 Playwright 实测计数得出。
> 人体 / 系统 / 器官页的结构直接在模型上点选，不使用独立热标层。

## 3. 页面计数说明（供评委核对）

- 上表 11 行即 BodyDay 对外声明的 **11 个页面**，封面与封底计入其中。
- 其中 03 / 04 / 05（系统）、06 / 07 / 08（器官）、09 / 10（细胞）是各自独立的直达路径，
  但**共用同一个工作台组件与同一套左右纸条**，差别只在镜头位置与两侧面板内容。
  它们不是「换一套外壳的新页面」，也不各自重新加载三维场景。
- 关于「20 页以内」：BodyDay 声明为 **11 页**，满足「不少于 10 页」且远低于 20 页上限。
- 页面索引同时内置于封底 `/about` 表格中，可按行逐条核对。

## 4. 截图复现方式

```bash
cd body-day
npm run dev            # 启动 http://localhost:5173
# 另开终端，在工程外的任意目录：
node scripts/capture-screenshots.mjs   # 依据上表逐页 goto + 等待 + screenshot
```

三维页面需要等待 atlas 从官方 CDN 加载；细胞页面为程序化几何本地生成，无网络依赖。
