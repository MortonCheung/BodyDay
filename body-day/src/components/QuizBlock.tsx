import { useState } from 'react';
import { SourceList } from './ui';
import type { QuizQuestion } from '../domain';

/**
 * 测验组件：选项 → 判定 → 解释 + 来源。
 * 反馈必须给出「为什么」，而不是只告诉对错。
 */
export function QuizBlock({
  question,
  initialPicked,
  onAnswered,
  locked,
}: {
  question: QuizQuestion;
  initialPicked?: string | null;
  onAnswered?: (questionId: string, correct: boolean) => void;
  locked?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(initialPicked ?? null);
  const answered = picked !== null;

  const pick = (key: string) => {
    if (answered || locked) return;
    setPicked(key);
    onAnswered?.(question.id, key === question.answerKey);
  };

  return (
    <div className="bd-quiz">
      <p className="bd-title" style={{ fontSize: 'var(--bd-fs-small)' }}>{question.prompt}</p>
      <div className="bd-stack bd-stack--tight" role="group" aria-label="测验选项">
        {question.options.map((option) => {
          const state = !answered
            ? undefined
            : option.key === question.answerKey
              ? 'correct'
              : option.key === picked
                ? 'wrong'
                : undefined;
          return (
            <button
              key={option.key}
              type="button"
              className="bd-quiz__option"
              data-state={state}
              disabled={answered || locked}
              aria-pressed={picked === option.key}
              onClick={() => pick(option.key)}
            >
              <span className="bd-quiz__key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="bd-feedback" aria-live="polite">
          <p className="bd-body-secondary" style={{ color: 'var(--bd-ink)' }}>
            {picked === question.answerKey ? '回答正确。' : `回答不正确，正确答案是 ${question.answerKey}。`}
          </p>
          <p className="bd-body-secondary">{question.explanation}</p>
          <SourceList ids={question.sourceIds} title="本题依据" />
        </div>
      ) : (
        <p className="bd-caption">选择一个选项后，这里会给出机制层面的解释与来源。</p>
      )}
    </div>
  );
}
