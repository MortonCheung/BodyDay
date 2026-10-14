import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AtlasStage, CellStage } from '../../three/lazyStages';
import { useAtlasSelection } from '../../three/atlasSelection';
import type { CellId } from '../../three/CellStage';
import { useStageState } from '../../three/useStageState';
import { PageHeader, SourceList } from '../../components/ui';
import { StageBoundary } from '../../components/StageBoundary';
import { QuizBlock } from '../../components/QuizBlock';
import { ROUTES } from '../../app/routes';
import {
  ATLAS_STRUCTURE_IDS,
  BODY_CONTEXT_BUNDLES,
  ENTITY_BUNDLE,
  ENTITY_STRUCTURE,
  type AtlasBundleId,
} from '../../services/atlas';
import { ENTITY_MAP, getLesson, type GuidedLesson, type LessonStep } from '../../domain';
import { markDiscovered, readOneLesson, saveOneLesson, resetLesson } from '../../services/progress';
import { useScaleVeil } from '../../app/AppProviders';

/**
 * 07 / 10 / 12 引导课程。
 *
 * 课程不是 PPT 翻页：关键步骤要求用户在**真实模型**上完成可检测的交互
 * （转动模型 / 聚焦结构 / 选中部件 / 跨尺度进入），测验带解释与来源。
 * 进度写入 localStorage，可逐步跳转、可重做、可返回自由探索。
 */

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId);
  if (!lesson) return <Navigate to={ROUTES.cover} replace />;
  return <LessonRunner key={lesson.id} lesson={lesson} />;
}

function LessonRunner({ lesson }: { lesson: GuidedLesson }) {
  const veil = useScaleVeil();
  const stage = useStageState();
  const atlasSel = useAtlasSelection(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = readOneLesson(lesson.id);
    if (!saved) return;
    setIndex(Math.min(saved.stepIndex, lesson.steps.length - 1));
    setCompleted(saved.completedStepIds);
    setAnswers(saved.answers);
  }, [lesson.id, lesson.steps.length]);

  useEffect(() => {
    saveOneLesson(lesson.id, {
      stepIndex: index,
      completedStepIds: completed,
      answers,
      updatedAt: new Date().toISOString(),
    });
  }, [lesson.id, index, completed, answers]);

  const step = lesson.steps[index];
  const markStepDone = useCallback((stepId: string) => {
    setCompleted((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  }, []);

  const entryEntity = ENTITY_MAP[lesson.entryEntityId];
  const target = step.targetEntityId ? ENTITY_MAP[step.targetEntityId] : undefined;

  /** 该步骤应该在哪个尺度上呈现 */
  const scope = useMemo<'atlas' | 'cell'>(() => {
    if (step.requiredInteraction?.startsWith('drilldown:')) return 'atlas';
    if (target && (target.kind === 'cell' || target.kind === 'organelle')) return 'cell';
    return 'atlas';
  }, [step.requiredInteraction, target]);

  const bundles = useMemo<AtlasBundleId[]>(() => {
    const set = new Set<AtlasBundleId>(BODY_CONTEXT_BUNDLES);
    const bundle = ENTITY_BUNDLE[lesson.entryEntityId];
    if (bundle) set.add(bundle);
    return Array.from(set);
  }, [lesson.entryEntityId]);

  const cellId: CellId = useMemo(() => {
    if (scope !== 'cell') return 'neuron';
    const cellEntity = target?.kind === 'cell' ? target : ENTITY_MAP[target?.parentId ?? ''];
    return cellEntity?.proceduralId === 'leukocyte' ? 'leukocyte' : 'neuron';
  }, [scope, target]);

  // 进入步骤时清理上一尺度残留状态
  useEffect(() => {
    stage.selectEntity(null);
    atlasSel.setStructureId(atlasSel.structureId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 自动判定：转动模型 / 选中部件
  useEffect(() => {
    const req = step.requiredInteraction;
    if (!req) return;
    if (req === 'rotate' && stage.userRotated) markStepDone(step.id);
    if (req.startsWith('select:') && stage.selectedEntityId === req.split(':')[1]) {
      markStepDone(step.id);
      stage.markUserRotate();
    }
  }, [step.id, step.requiredInteraction, stage.userRotated, stage.selectedEntityId, markStepDone, stage]);

  useEffect(() => {
    if (step.targetEntityId) markDiscovered(step.targetEntityId);
  }, [step.targetEntityId]);

  const satisfied = useMemo(() => {
    const req = step.requiredInteraction;
    if (!req || req === 'answer') return completed.includes(step.id);
    if (req === 'rotate') return stage.userRotated;
    if (req.startsWith('select:')) return stage.selectedEntityId === req.split(':')[1];
    if (req.startsWith('focus:')) return completed.includes(step.id);
    if (req.startsWith('drilldown:')) return completed.includes(step.id);
    return true;
  }, [step.requiredInteraction, completed, step.id, stage.userRotated, stage.selectedEntityId]);

  const canAdvance = ['observe', 'explain', 'summary'].includes(step.kind) || satisfied;

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(lesson.steps.length - 1, next)));
    stage.selectEntity(null);
  };

  const advance = () => {
    markStepDone(step.id);
    if (index < lesson.steps.length - 1) goTo(index + 1);
  };

  const doFocus = (entityId: string) => {
    const structureId = ENTITY_STRUCTURE[entityId];
    if (!structureId) return;
    atlasSel.setStructureId(structureId);
    stage.requestFocus(structureId);
    markStepDone(step.id);
  };

  const doDrilldown = (targetEntityId: string) => {
    const t = ENTITY_MAP[targetEntityId];
    if (!t?.proceduralId) return;
    markStepDone(step.id);
    veil.run(ROUTES.cell(t.proceduralId), {
      from: 'organ',
      to: t.kind === 'cell' ? 'cell' : 'organelle',
      caption: `课程下一步：进入 ${t.nameZh}。尺度变小，模型更换。`,
    });
  };

  return (
    <div className="bd-container bd-container--wide bd-page">
      <PageHeader
        eyebrow={`${lesson.title} · 引导教学`}
        title={lesson.theme}
        lead={lesson.goal}
        scale={scope === 'cell' ? 'cell' : 'organ'}
        crumbs={[
          { label: '封面', to: ROUTES.cover },
          { label: '引导教学' },
          { label: lesson.title },
        ]}
        actions={
          <>
            <button
              type="button"
              className="bd-button bd-button--sm"
              onClick={() => {
                resetLesson(lesson.id);
                setIndex(0);
                setCompleted([]);
                setAnswers({});
              }}
            >
              重做课程
            </button>
            <Link className="bd-button bd-button--sm bd-button--quiet" to={ROUTES.body}>
              返回自由探索
            </Link>
          </>
        }
      />

      <div className="bd-stage-page">
        <aside className="bd-stage-page__rail">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">课程步骤</span>
            <nav className="bd-list" aria-label="课程步骤">
              {lesson.steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="bd-list__item"
                  data-active={i === index}
                  onClick={() => goTo(i)}
                >
                  <span className="bd-list__mark" aria-hidden="true" />
                  <span className="bd-list__name">
                    {String(i + 1).padStart(2, '0')} {s.title}
                  </span>
                  <span className="bd-list__hint">{completed.includes(s.id) ? '已完成' : ''}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">课程入口</span>
            <p className="bd-body-secondary">
              本课程从 <strong>{entryEntity?.nameZh ?? lesson.entryEntityId}</strong> 出发。
              想自由探索可随时
              <Link to={ROUTES.body} style={{ borderBottom: '1px solid var(--bd-rule-strong)' }}> 返回人体</Link>
              ，课程不会强行接管你的浏览。
            </p>
          </div>

          <SourceList ids={lesson.sourceIds} title="课程依据" />
        </aside>

        <section aria-label="三维舞台">
          <div className="bd-stack">
            <div className="bd-stepbar" aria-hidden="true">
              {lesson.steps.map((s, i) => (
                <span className="bd-stepbar__seg" key={s.id}>
                  <span
                    className="bd-stepbar__fill"
                    style={{ transform: `scaleX(${completed.includes(s.id) || i < index ? 1 : 0})` }}
                  />
                </span>
              ))}
            </div>

            <div className="bd-stage bd-stage--tall">
              {scope === 'atlas' ? (
                <StageBoundary label="课程舞台">
                  <AtlasStage
                    bundles={bundles}
                    selectedStructureId={atlasSel.structureId}
                    onSelectStructure={atlasSel.setStructureId}
                    onStructureInfo={atlasSel.setInfo}
                    focusNonce={stage.focusNonce}
                    resetNonce={stage.resetNonce}
                    onInteractionStart={stage.markUserRotate}
                    visibleLayers={undefined}
                    alwaysVisibleIds={[ATLAS_STRUCTURE_IDS.bodyShell, ATLAS_STRUCTURE_IDS.skeleton]}
                    isolationMode="parent-context"
                    ariaLabel="课程舞台：人体与器官"
                  />
                </StageBoundary>
              ) : (
                <StageBoundary label="课程舞台">
                  <CellStage cellId={cellId} state={stage} ariaLabel="课程舞台：细胞结构" />
                </StageBoundary>
              )}

              <div className="bd-stage__hud">
                <span className="bd-label">
                  步骤 {String(index + 1).padStart(2, '0')} / {String(lesson.steps.length).padStart(2, '0')}
                </span>
                <span className="bd-caption">
                  {scope === 'cell' ? '当前尺度：细胞' : '当前尺度：人体 / 器官'}
                </span>
              </div>
            </div>

            <InteractionHint step={step} satisfied={satisfied} />
          </div>
        </section>

        <aside className="bd-stage-page__info">
          <div className="bd-step">
            <div className="bd-step__eyebrow">
              <span className="bd-badge bd-badge--plain">{kindLabel(step.kind)}</span>
              <span className="bd-caption">
                {String(index + 1).padStart(2, '0')} / {String(lesson.steps.length).padStart(2, '0')}
              </span>
            </div>
            <h2 className="bd-section-title" style={{ fontSize: '1.5rem' }}>{step.title}</h2>
            <p className="bd-body">{step.body}</p>

            {step.question ? (
              <QuizBlock
                question={step.question}
                initialPicked={answers[step.question.id] ? step.question.answerKey : null}
                onAnswered={(qid, correct) => {
                  setAnswers((prev) => ({ ...prev, [qid]: correct }));
                  markStepDone(step.id);
                }}
              />
            ) : null}

            {step.requiredInteraction?.startsWith('focus:') ? (
              <button
                type="button"
                className="bd-button bd-button--primary"
                onClick={() => doFocus(step.requiredInteraction!.split(':')[1])}
              >
                聚焦 {ENTITY_MAP[step.requiredInteraction.split(':')[1]]?.nameZh ?? '目标结构'}
              </button>
            ) : null}

            {step.requiredInteraction?.startsWith('drilldown:') ? (
              <button
                type="button"
                className="bd-button bd-button--primary"
                onClick={() => doDrilldown(step.requiredInteraction!.split(':')[1])}
              >
                进入 {ENTITY_MAP[step.requiredInteraction.split(':')[1]]?.nameZh ?? '下一尺度'}
              </button>
            ) : null}

            {target ? (
              <div className="bd-panel bd-panel--flat">
                <span className="bd-label">本步骤指向的结构</span>
                <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)', marginTop: 4 }}>{target.nameZh}</p>
                <p className="bd-caption">
                  {target.kind} · {target.atlasStructureId || target.proceduralId ? '该结构在模型中真实存在' : '以知识卡呈现'}
                </p>
              </div>
            ) : null}

            {step.sourceIds ? <SourceList ids={step.sourceIds} title="本步骤依据" /> : null}

            <div className="bd-row">
              <button
                type="button"
                className="bd-button bd-button--quiet"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                上一步
              </button>
              <button
                type="button"
                className="bd-button bd-button--primary"
                disabled={!canAdvance || index === lesson.steps.length - 1}
                onClick={advance}
              >
                {canAdvance ? '下一步' : '先完成本步交互'}
              </button>
              <button
                type="button"
                className="bd-button bd-button--quiet"
                disabled={index === lesson.steps.length - 1}
                onClick={() => {
                  markStepDone(step.id);
                  goTo(index + 1);
                }}
              >
                跳过本步
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function kindLabel(kind: LessonStep['kind']): string {
  const map: Record<LessonStep['kind'], string> = {
    observe: '观察',
    interact: '交互',
    explain: '解释',
    quiz: '测验',
    summary: '小结',
  };
  return map[kind];
}

function InteractionHint({ step, satisfied }: { step: LessonStep; satisfied: boolean }) {
  const req = step.requiredInteraction;
  if (!req || req === 'answer') return null;
  const name = ENTITY_MAP[req.split(':')[1]]?.nameZh ?? '目标结构';
  const text =
    req === 'rotate'
      ? '请在模型上拖动一次旋转它，完成本步。'
      : req.startsWith('focus:')
        ? `请点击右侧的「聚焦 ${name}」按钮。`
        : req.startsWith('select:')
          ? `请在模型或热标中点选「${name}」。`
          : `请点击右侧的「进入」按钮完成跨尺度切换。`;
  return (
    <div className="bd-task" data-done={satisfied}>
      <span className="bd-task__state">{satisfied ? '本步交互已完成' : '等待交互'}</span>
      <span className="bd-task__title">{text}</span>
    </div>
  );
}
