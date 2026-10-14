import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Notice, SourceList } from '../../components/ui';
import { ROUTES } from '../../app/routes';
import {
  ENTITIES,
  LESSONS,
  allQuizQuestions,
  getEntity,
} from '../../domain';
import {
  clearAllProgress,
  isStorageAvailable,
  readDiscovered,
  readLessonProgress,
} from '../../services/progress';

/**
 * 14 学习总结。
 *
 * 只展示本机真实记录：已发现结构、课程进度、测验作答。
 * 记录存在 localStorage 中，可一键清空；不新建后端、不收集任何数据。
 */

export function SummaryPage() {
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, { stepIndex: number; completedStepIds: string[]; answers: Record<string, boolean> }>>({});
  const [storageOk, setStorageOk] = useState(true);

  const refresh = () => {
    setDiscovered(readDiscovered());
    setProgress(readLessonProgress());
    setStorageOk(isStorageAvailable());
  };

  useEffect(() => {
    refresh();
  }, []);

  const quizzes = useMemo(() => allQuizQuestions(), []);

  const answeredCount = useMemo(
    () => Object.values(progress).reduce((sum, p) => sum + Object.keys(p.answers).length, 0),
    [progress],
  );
  const correctCount = useMemo(
    () => Object.values(progress).reduce((sum, p) => sum + Object.values(p.answers).filter(Boolean).length, 0),
    [progress],
  );

  const learnable = useMemo(
    () => ENTITIES.filter((e) => e.kind === 'organ' || e.kind === 'cell' || e.kind === 'system'),
    [],
  );

  return (
    <div className="bd-container bd-container--prose bd-page">
      <div className="bd-stack bd-stack--wide">
        <PageHeader
          eyebrow="14 · 学习总结"
          title="你在这条尺度轴上走到了哪一步"
          lead="这里只显示你在这台设备上真实产生的记录。数据保存在浏览器本地，可以随时清空。"
          crumbs={[{ label: '封面', to: ROUTES.cover }, { label: '学习总结' }]}
          actions={
            <button
              type="button"
              className="bd-button bd-button--sm bd-button--danger"
              onClick={() => {
                clearAllProgress();
                refresh();
              }}
            >
              清空学习记录
            </button>
          }
        />

        {!storageOk ? (
          <Notice tone="warn" title="本机浏览器不可用本地存储">
            可能处于隐私模式。学习进度将不会保存，但所有内容仍可正常浏览。
          </Notice>
        ) : null}

        <section className="bd-section">
          <div className="bd-spread">
            <div className="bd-stack bd-stack--tight">
              <span className="bd-label">概览</span>
              <h2 className="bd-section-title">进度</h2>
            </div>
            <div className="bd-row" style={{ gap: 'var(--bd-space-6)' }}>
              <Metric label="已发现结构" value={`${discovered.length} / ${learnable.length}`} />
              <Metric label="测验作答" value={`${answeredCount} / ${quizzes.length}`} />
              <Metric label="答对" value={`${correctCount}`} />
            </div>
          </div>

          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">课程进度</span>
            {LESSONS.map((lesson) => {
              const p = progress[lesson.id];
              const doneCount = p?.completedStepIds.length ?? 0;
              const total = lesson.steps.length;
              return (
                <div className="bd-panel bd-panel--flat" key={lesson.id}>
                  <div className="bd-spread">
                    <div>
                      <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{lesson.title}</p>
                      <p className="bd-caption">{lesson.theme}</p>
                    </div>
                    <span className="bd-meta">{doneCount} / {total} 步</span>
                  </div>
                  <div className="bd-progress" style={{ marginTop: 10 }}>
                    <div className="bd-progress__bar" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
                  </div>
                  <div className="bd-row" style={{ marginTop: 12 }}>
                    <Link className="bd-button bd-button--sm" to={ROUTES.lesson(lesson.id)}>
                      {doneCount > 0 && doneCount < total ? '继续课程' : doneCount >= total ? '重看课程' : '开始课程'}
                    </Link>
                    <span className="bd-caption">
                      {doneCount >= total ? '本章已完成' : doneCount > 0 ? '进行中' : '未开始'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">已发现结构</span>
            <h2 className="bd-section-title">结构图谱</h2>
            <p className="bd-body-secondary">
              点亮的条目表示你已经打开或选中过它。灰条表示还没走到。
            </p>
          </div>
          <div className="bd-discovered">
            {learnable.map((entity) => (
              <span
                className="bd-discovered__chip"
                key={entity.id}
                data-seen={discovered.includes(entity.id)}
              >
                {entity.nameZh}
              </span>
            ))}
          </div>
          <div className="bd-row" style={{ marginTop: 'var(--bd-space-4)' }}>
            <Link className="bd-button" to={ROUTES.body}>
              继续探索人体
            </Link>
            <Link className="bd-button bd-button--quiet" to={ROUTES.relations}>
              打开科学关系图
            </Link>
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">测验回顾</span>
            <h2 className="bd-section-title">你答过的题</h2>
          </div>
          <div className="bd-stack bd-stack--tight">
            {quizzes.map(({ lessonId, lessonTitle, question }) => {
              const result = progress[lessonId]?.answers[question.id];
              return (
                <div className="bd-panel bd-panel--flat" key={question.id}>
                  <div className="bd-spread">
                    <span className="bd-caption">{lessonTitle}</span>
                    <span className="bd-meta">
                      {result === undefined ? '未作答' : result ? '答对' : '答错'}
                    </span>
                  </div>
                  <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)', marginTop: 6 }}>
                    {question.prompt}
                  </p>
                  {result !== undefined ? (
                    <p className="bd-body-secondary" style={{ marginTop: 6 }}>{question.explanation}</p>
                  ) : null}
                  <SourceList ids={question.sourceIds} title="本题依据" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">下一步</span>
            <h2 className="bd-section-title">还没走完的路线</h2>
          </div>
          <div className="bd-grid bd-grid--3">
            {[
              { id: 'brain', title: '大脑 → 神经元', note: '神经信号与神经系统健康' },
              { id: 'spleen', title: '脾脏 → 白细胞', note: '免疫细胞如何参与防御' },
              { id: 'heart', title: '心脏 → 循环 → 白细胞', note: '血液循环如何运输细胞与物质' },
            ].map((route) => {
              const entity = getEntity(route.id);
              if (!entity) return null;
              return (
                <Link className="bd-rel" key={route.id} to={ROUTES.organ(route.id)}>
                  <span className="bd-rel__type" data-type="part_of">路线</span>
                  <span className="bd-title" style={{ fontFamily: 'var(--bd-font-display)', fontSize: '1.3rem' }}>
                    {route.title}
                  </span>
                  <span className="bd-caption">{route.note}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="bd-label">{label}</span>
      <p className="bd-number" style={{ fontSize: '1.6rem', marginTop: 2 }}>{value}</p>
    </div>
  );
}
