# BodyDay · 来源清单与可达性校验（SOURCES）

> 校验时间：**2026-10-14**。下表每一条都由本机实际发起 HTTP 请求确认可达性。
> 表中 `HTTP` 列为当日实测结果；异常项附说明，不做掩盖。

| 编号 | 出版者 | 标题 | 许可 | HTTP | 链接 |
|---|---|---|---|---|---|
| S01 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · 12.2 Nervous Tissue | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/12-2-nervous-tissue |
| S02 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · 12.1 Basic Structure and Function of the Nervous System | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/12-1-basic-structure-and-function-of-the-nervous-system |
| S03 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · 19.1 Heart Anatomy | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy |
| S04 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · 18.1 An Overview of Blood | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood |
| S05 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · 21.1 Anatomy of the Lymphatic and Immune Systems | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems |
| S06 | 美国国立神经疾病与卒中研究所（NINDS / NIH） | Brain Basics | — | 200（带浏览器 UA；无 UA 时 403） | https://www.ninds.nih.gov/health-information/public-education/brain-basics |
| S07 | 美国国立心肺血液研究所（NHLBI / NIH） | Heart | — | 200 | https://www.nhlbi.nih.gov/health/heart |
| S08 | 美国国立心肺血液研究所（NHLBI / NIH） | Sleep Deprivation | — | 200 | https://www.nhlbi.nih.gov/health/sleep-deprivation |
| S09 | 美国国立糖尿病、消化与肾脏疾病研究所（NIDDK / NIH） | What Is Diabetes? | — | 200 | https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes |
| S10 | 世界卫生组织（WHO） | Physical activity | — | 200 | https://www.who.int/news-room/fact-sheets/detail/physical-activity |
| S11 | 世界卫生组织（WHO） | Healthy diet | — | 200 | https://www.who.int/news-room/fact-sheets/detail/healthy-diet |
| S12 | 世界卫生组织（WHO） | Hypertension | — | 200 | https://www.who.int/news-room/fact-sheets/detail/hypertension |
| S13 | 美国疾病控制与预防中心（CDC） | Physical Activity Basics | — | 200 | https://www.cdc.gov/physical-activity-basics/ |
| S14 | MedlinePlus（美国国家医学图书馆 / NIH） | Blood | — | 200 | https://medlineplus.gov/blood.html |
| S15 | 国家卫生健康委员会 | 中国公民健康素养——基本知识与技能（2024年版） | — | **412（站点 WAF 防护）** | https://www.nhc.gov.cn/xcs/c100123/202405/73a4927142f34152abed875634a3c13b.shtml |
| S16 | Human Reference Atlas（HuBMAP） | 3D Reference Library | CC BY 4.0 | 200 | https://humanatlas.io/3d-reference-library |
| S17 | Vanatome / Z-Anatomy | Vanatome Human Atlas 1.4.0（含 ASSET-LICENSE.md；V2 仅使用其整具人体**资产**，不使用其查看器代码） | 代码 MIT / 资产 CC BY-SA 4.0 | 200 | https://github.com/vixotic/Vanatome |
| S18 | 世界卫生组织（WHO） | Immunization（问答） | — | 200 | https://www.who.int/news-room/questions-and-answers/item/immunization |
| S19 | OpenStax（莱斯大学） | Anatomy and Physiology 2e · Ch. 1 Introduction（含器官系统总览） | CC BY 4.0 | 200 | https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction |

## 异常项说明

- **S15（412）**：国家卫健委站点对自动化访问有防护（返回 412 Precondition Failed），
  人工浏览器可正常打开。该来源为任务书给定的权威依据，作品仅引用其**方向性要求**
  （健康生活方式、青少年健康、常见病预防），不复制其条目原文。
- **S06（403 / 200 差异）**：NINDS 在无浏览器 UA 时返回 403，带正常 UA 时 200。
  该行为记录在此，不视为不可达。
- **MedlinePlus**：当日出现过间歇性连接失败（curl 返回 000），重试后 `S14` 为 200。
  作品对该来源的引用为血液组成的通用描述，并同时有 S04（OpenStax）交叉支撑。
- **NCBI Bookshelf**：评估过 StatPearls 条目作为补充来源，但该站对自动化访问触发
  reCAPTCHA，无法核验标题，因此**未纳入**正式来源表，避免出现无法核实的引用。

## 引用原则

1. 每条科普结论、每道测验题与解释都带来源编号；
2. 同一结论尽量由 ≥2 个独立来源交叉核对（例如血液组成同时使用 S04 与 S14）；
3. 有争议、版本差异或无法核实的细节**标注为待核，不进入正式科普正文**；
4. 不复制来源的正文、图表或数据表；
5. 测验考的是**机制理解**，不是数字记忆（有自动化测试护栏，见 `src/domain/domain.test.ts`）。
