import { QuizBlock } from '../../components/QuizBlock';
import { ENTITY_MAP, type GuidedLesson, type LessonStepKind } from '../../domain';

/**
 * 引导教学模式的面板。
 *
 * 它**不是一套课程页面**，而是贴在右纸条最前面的一个步骤引导：
 * 每一步只做一件事——把镜头带到真实结构上，并说明这个结构。
 * 模型、纸条、左栏全部沿用自由探索那一套，不另建页面、不另开画布。
 */

const STEP_KIND_LABEL: Record<LessonStepKind, string> = {
  observe: '观察',
  interact: '操作',
  explain: '讲解',
  quiz: '检验',
  summary: '小结',
};

interface GuidePanelProps {
  lesson: GuidedLesson;
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

export function GuidePanel({ lesson, stepIndex, onPrev, onNext, onExit }: GuidePanelProps) {
  const step = lesson.steps[stepIndex];
  if (!step) return null;

  const target = step.targetEntityId ? ENTITY_MAP[step.targetEntityId] : undefined;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === lesson.steps.length - 1;

  return (
    <section className="bd-guide" aria-label="引导教学">
      <div className="bd-wb-section__head">
        <span className="bd-label">
          引导教学 ·
          {' '}
          {lesson.title}
        </span>
        <button type="button" className="bd-chip" onClick={onExit}>
          退出引导
        </button>
      </div>

      <div className="bd-guide__steps" role="presentation">
        {lesson.steps.map((item, index) => (
          <span
            key={item.id}
            className="bd-guide__seg"
            data-done={index <= stepIndex}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="bd-guide__step">
        <div className="bd-guide__meta">
          <span className="bd-meta">
            步骤
            {' '}
            {String(stepIndex + 1).padStart(2, '0')}
            {' / '}
            {String(lesson.steps.length).padStart(2, '0')}
          </span>
          <span className="bd-meta">{STEP_KIND_LABEL[step.kind]}</span>
        </div>

        <p className="bd-title" style={{ fontSize: 'var(--bd-fs-title)' }}>{step.title}</p>
        <p className="bd-guide__body">{step.body}</p>

        {target ? (
          <p className="bd-guide__target">
            这一步对应模型中的「{target.nameZh}」——中间的场景已经把镜头带到它上面。
          </p>
        ) : null}

        {step.question ? (
          <QuizBlock question={step.question} />
        ) : null}

        <div className="bd-guide__actions">
          <button type="button" className="bd-button bd-button--sm" onClick={onPrev} disabled={isFirst}>
            上一步
          </button>
          <button
            type="button"
            className="bd-button bd-button--sm bd-button--primary"
            onClick={onNext}
            disabled={isLast}
          >
            {isLast ? '已完成' : '下一步'}
          </button>
        </div>

        <p className="bd-wb-note">
          随时可以关掉引导、或者在顶部切回「自由探索」；模型与你的探索进度都不会被重置。
        </p>
      </div>
    </section>
  );
}
