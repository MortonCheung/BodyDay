import { Link } from 'react-router-dom';
import { useAppMode } from '../../app/AppProviders';
import { ROUTES } from '../../app/routes';
import { SCALES, getSource } from '../../domain';

/**
 * 01 封面。
 *
 * 首屏不做 3D：第一帧要快、要稳、要能立刻读懂这是一件什么作品。
 * 三维从「人体总览」页才开始按需加载。
 */
export function CoverPage() {
  const { setMode } = useAppMode();

  return (
    <div
      className="bd-container bd-container--prose"
      style={{ paddingTop: 'calc(var(--bd-nav-height) + 5vh)', paddingBottom: 'var(--bd-space-9)' }}
    >
      <div className="bd-stack bd-stack--wide">
        <header className="bd-stack bd-stack--tight">
          <span className="bd-label">2026 辽宁省大学生科普设计大赛 · 非医类健康科普赛道</span>
          <h1 className="bd-display">身体的一天</h1>
          <div className="bd-row" style={{ gap: 'var(--bd-space-4)' }}>
            <span className="bd-meta" style={{ letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              BodyDay
            </span>
            <span className="bd-caption">跨尺度交互式健康科普 · 人体 → 器官 → 细胞</span>
          </div>
          <p className="bd-lead" style={{ marginTop: 'var(--bd-space-5)' }}>
            从一具可以转动的完整人体出发，逐层进入到系统、器官、细胞，直到细胞内部可识别的结构。
            每一层都能点击、能追问、能回溯，并且告诉你这条知识来自哪里。
          </p>
        </header>

        <ScaleSpine />

        <div className="bd-row" style={{ gap: 'var(--bd-space-3)' }}>
          <Link
            to={ROUTES.body}
            className="bd-button bd-button--primary"
            onClick={() => setMode('explore')}
          >
            进入自由探索
          </Link>
          <Link
            to={ROUTES.lesson('neural')}
            className="bd-button"
            onClick={() => setMode('learn')}
          >
            进入引导教学
          </Link>
          <Link to={ROUTES.guide} className="bd-button bd-button--quiet">
            先看使用向导
          </Link>
        </div>

        <div className="bd-grid bd-grid--3">
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">它是什么</span>
            <p className="bd-body-secondary">
              一件可探索、可教学的交互式科普作品：两种模式共用同一套人体 / 器官 / 细胞模型舞台。
            </p>
          </div>
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">它不做什么</span>
            <p className="bd-body-secondary">
              不做医疗诊断，不做个体化建议，不把示意图说成真实解剖配准，也不用「一键显示全部」伪造关系。
            </p>
          </div>
          <div className="bd-panel bd-panel--flat">
            <span className="bd-label">从哪里读证据</span>
            <p className="bd-body-secondary">
              每条路线、每道测验都标注来源编号，可在
              {' '}
              <Link to={ROUTES.about} style={{ borderBottom: '1px solid var(--bd-rule-strong)' }}>
                关于页
              </Link>
              {' '}
              查阅完整来源表。
            </p>
          </div>
        </div>

        <footer className="bd-footer">
          <div className="bd-spread">
            <span>
              科普依据对齐《中国公民健康素养——基本知识与技能（2024年版）》方向，关键信息交叉核对 WHO / NIH / CDC 与开放教材。
              <br />
              三维解剖数据：Z-Anatomy（CC BY-SA 4.0）经 Vanatome 导出；细胞几何为本作品程序化原创。
            </span>
            <SourceListMini />
          </div>
        </footer>
      </div>
    </div>
  );
}

function SourceListMini() {
  const who = getSource('S10');
  const nhc = getSource('S15');
  return (
    <span className="bd-caption" style={{ textAlign: 'right', minWidth: 200 }}>
      来源示例：{nhc?.publisher}（S15）；{who?.publisher}（S10）
    </span>
  );
}

/** 尺度主轴：本作品的原创视觉母题 —— 一条把六个尺度串起来的细线 */
function ScaleSpine() {
  const marks = SCALES.filter((s) => s.id !== 'system' || true);
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 640 156"
        width="100%"
        height="156"
        role="img"
        aria-label="BodyDay 的跨尺度主轴：人体、系统、器官、组织、细胞、结构"
        style={{ overflow: 'visible' }}
      >
        <line x1="16" y1="78" x2="624" y2="78" stroke="var(--bd-rule-strong)" strokeWidth="1" />
        {marks.map((scale, index) => {
          const x = 16 + (608 / (marks.length - 1)) * index;
          const strong = scale.id === 'body' || scale.id === 'cell';
          return (
            <g key={scale.id} transform={`translate(${x}, 78)`}>
              <circle r={strong ? 4.5 : 2.5} fill={strong ? 'var(--bd-ink)' : 'var(--bd-paper)'} stroke="var(--bd-ink)" strokeWidth="1" />
              <text
                y={strong ? 30 : 26}
                textAnchor="middle"
                fontFamily="var(--bd-font-mono)"
                fontSize="10"
                letterSpacing="1.4"
                fill={strong ? 'var(--bd-ink)' : 'var(--bd-ink-muted)'}
              >
                {scale.labelEn.toUpperCase()}
              </text>
              <text
                y={strong ? 46 : 42}
                textAnchor="middle"
                fontFamily="var(--bd-font-display)"
                fontSize={strong ? 17 : 14}
                fill={strong ? 'var(--bd-ink)' : 'var(--bd-ink-soft)'}
              >
                {scale.labelZh}
              </text>
              <text
                y={strong ? -36 : -30}
                textAnchor="middle"
                fontFamily="var(--bd-font-text)"
                fontSize="11"
                fill="var(--bd-ink-faint)"
                style={{ maxWidth: 90 }}
              >
                {scale.note.replace(/，.*$/, '')}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="bd-caption">
        作品的导航与转场都沿这条尺度轴进行：向下一步进入更小的结构，向上一路返回，始终知道自己在哪一层。
      </figcaption>
    </figure>
  );
}
