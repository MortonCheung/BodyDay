import { Link } from 'react-router-dom';
import { PageHeader, Notice } from '../../components/ui';
import { ROUTES, PAGE_INDEX } from '../../app/routes';
import { ENTITIES, LESSONS, RELATIONS, SOURCES } from '../../domain';
import { ATLAS_ATTRIBUTION_TEXT } from '../../services/organAssets';
import { resolveCatalogUrl } from '../../services/atlas';

/**
 * 15 封底 / 关于。
 *
 * 这一页承担四件事：方法说明、完整来源表、第三方版权与许可、科学免责声明。
 * 同时公开页面的真实结构，便于评审逐页核对。
 */

export function AboutPage() {
  return (
    <div className="bd-container bd-container--prose bd-page">
      <div className="bd-stack bd-stack--wide">
        <PageHeader
          eyebrow="15 · 封底 / 关于"
          title="BodyDay 是怎么做出来的"
          lead="把「来源、边界、许可」写在最后一页，是因为科普作品的公信力和它的画面一样重要。"
          crumbs={[{ label: '封面', to: ROUTES.cover }, { label: '关于' }]}
        />

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">方法</span>
            <h2 className="bd-section-title">内容是怎么被组织起来的</h2>
          </div>
          <div className="bd-grid bd-grid--2">
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">结构化数据</span>
              <p className="bd-body-secondary">
                实体 {ENTITIES.length} 条、科学关系 {RELATIONS.length} 条、引导课程 {LESSONS.length} 套、来源 {SOURCES.length} 条，
                全部为纯数据，可逐条核对与扩展。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">真实模型优先</span>
              <p className="bd-body-secondary">
                人体与器官层只使用 atlas 中**真实存在**的结构 ID（如 <code>cerebrum</code>、<code>heart</code>、<code>spleen</code>）；
                聚焦前会先确认该 ID 存在于模型元数据中。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">关系语义化</span>
              <p className="bd-body-secondary">
                结构隶属、功能相关、循环输送、疾病语境分别登记，关系卡片永远写出自己的科学语义，
                不使用自动兜底关系。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">来源可追溯</span>
              <p className="bd-body-secondary">
                每条知识、每道测验都带来源编号；来源表列出出版者、标题、原始链接与访问日期。
                医学细节若无法核对，标注为待核，不进入正式科普正文。
              </p>
            </div>
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">来源</span>
            <h2 className="bd-section-title">完整来源表（{SOURCES.length} 条）</h2>
            <p className="bd-body-secondary">
              以下链接均在 2026-10-14 实际发起 HTTP 请求校验可达性。标注「注」的条目对自动化访问有防护，人工浏览器可正常打开。
            </p>
          </div>
          <table className="bd-table">
            <thead>
              <tr>
                <th scope="col">编号</th>
                <th scope="col">出版者</th>
                <th scope="col">标题</th>
                <th scope="col">许可</th>
                <th scope="col">链接</th>
                <th scope="col">访问日期</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.publisher}</td>
                  <td>
                    {s.title}
                    <br />
                    <span className="bd-caption">{s.scope}</span>
                  </td>
                  <td>{s.license ?? '—'}</td>
                  <td>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">
                      打开
                    </a>
                  </td>
                  <td>{s.accessDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">版权与许可</span>
            <h2 className="bd-section-title">第三方资源与权利说明</h2>
          </div>
          <div className="bd-stack bd-stack--tight">
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">解剖模型</span>
              <p className="bd-body-secondary">
                {ATLAS_ATTRIBUTION_TEXT}
                <br />
                来源：Z-Anatomy — The libre 3D atlas of anatomy（主要贡献者 Gauthier Kervyn、Marcin Zielinski），
                许可是 Creative Commons Attribution-ShareAlike 4.0 International。
                本作品对 atlas 的适配包括：结构 ID 映射、系统按需加载、外观参数调整；分发适配版本时按 CC BY-SA 4.0 履行署名、
                标明修改并以相同方式共享。
                <br />
                当前使用的 atlas 目录地址：
                <code style={{ wordBreak: 'break-all' }}> {resolveCatalogUrl()}</code>
                （亦可通过环境变量 <code>VITE_BODYDAY_ATLAS_URL</code> 指向同版本自建镜像）。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">查看器与代码</span>
              <p className="bd-body-secondary">
                Vanatome 查看器（<code>@vixotic/vanatome-react</code>、<code>@vixotic/vanatome-atlas</code>）为 MIT 许可的第三方依赖；
                其余前端技术栈包括 React、Three.js、React Three Fiber、Drei、React Router（均为 MIT）。
                <br />
                BodyDay 自身的产品结构、交互设计、视觉系统、科普文本、关系数据、课程状态机与
                <strong>程序化细胞几何</strong>均为本作品原创实现。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">明确未采用</span>
              <p className="bd-body-secondary">
                评估过第三方细胞模型（许可不明或体量过大）与部分器官 GLB（实测仅为局部解剖参照，不足以代表完整器官），
                均未采用，避免科学误导与版权风险。完整评估记录见作品仓库的
                <code> docs/REFERENCE_ADOPTION.md</code>。
              </p>
            </div>
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">声明</span>
            <h2 className="bd-section-title">科学免责声明</h2>
          </div>
          <Notice tone="warn" title="请务必阅读">
            <ul className="bd-body-secondary" style={{ display: 'grid', gap: 8 }}>
              <li>· 本作品为面向大众的健康科普作品，<strong>不构成医疗建议</strong>，不能用于疾病诊断、治疗或用药决策。</li>
              <li>· 三维解剖与细胞模型为科普示意：器官不按真实比例；细胞为程序化概括形态；标注点为示意位置，未与模型做逐点配准。</li>
              <li>· 作品呈现的跨尺度切换为语义连续的镜头转场，不声称与真实人体空间坐标严格配准。</li>
              <li>· 内容面向健康人群的通用科普；个体健康状况请咨询专业医务人员。</li>
            </ul>
          </Notice>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">页面索引</span>
            <h2 className="bd-section-title">作品的可访问页面（{PAGE_INDEX.length} 页）</h2>
            <p className="bd-body-secondary">
              每个页面都可独立直达、具有实质内容与独立交互，符合赛事对 H5 页面数量的要求。带参数的路由表示同一版式下的多个可核查页面。
            </p>
          </div>
          <table className="bd-table">
            <thead>
              <tr>
                <th scope="col">序号</th>
                <th scope="col">页面</th>
                <th scope="col">路径</th>
                <th scope="col">尺度</th>
                <th scope="col">核心内容</th>
              </tr>
            </thead>
            <tbody>
              {PAGE_INDEX.map((p) => (
                <tr key={p.no}>
                  <td>{p.no}</td>
                  <td>
                    <Link to={p.path.replace(':systemId', 'nervous-system').replace(':organId', 'brain').replace(':cellId', 'neuron').replace(':lessonId', 'neural')}>
                      {p.title}
                    </Link>
                  </td>
                  <td><code>{p.path}</code></td>
                  <td>{p.scale}</td>
                  <td>{p.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">返回</span>
            <h2 className="bd-section-title">继续探索</h2>
          </div>
          <div className="bd-row">
            <Link className="bd-button bd-button--primary" to={ROUTES.body}>
              回到人体总览
            </Link>
            <Link className="bd-button" to={ROUTES.guide}>
              再看使用向导
            </Link>
            <Link className="bd-button bd-button--quiet" to={ROUTES.summary}>
              查看学习记录
            </Link>
          </div>
        </section>

        <footer className="bd-footer">
          <div className="bd-spread">
            <span>BodyDay · 身体的一天｜2026 辽宁省大学生科普设计大赛 · 非医类健康科普赛道</span>
            <span>跨尺度交互式健康科普 · 人体 → 器官 → 细胞 → 结构</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
