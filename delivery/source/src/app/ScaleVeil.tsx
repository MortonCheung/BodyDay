import { SCALES, type Scale } from '../domain';

export interface VeilRequest {
  from: Scale;
  to: Scale;
  caption: string;
}

/**
 * 跨尺度转场遮罩。
 *
 * 它回答一个问题：「我刚刚看到的东西，和新看到的东西，尺度差多少？」
 * BodyDay 不承诺「几何连续真实穿越」——换模型时明确交代尺度变化，
 * 并用遮罩掩盖两个 WebGL 场景的切换瞬间。
 */
export function ScaleVeil({ request }: { request: VeilRequest | null }) {
  return (
    <div className="bd-scaleveil" data-open={Boolean(request)} aria-hidden={!request}>
      <div className="bd-scaleveil__axis" role="presentation">
        {SCALES.map((s, index) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--bd-space-3)' }}>
            <div
              className="bd-scaleveil__node"
              data-active={request?.to === s.id}
              data-past={request?.from === s.id}
            >
              <span className="bd-scaleveil__tick" />
              <span className="bd-scaleveil__label">{s.labelZh}</span>
            </div>
            {index < SCALES.length - 1 ? (
              <span className="bd-scaleveil__tick" style={{ height: 1, width: 20 }} />
            ) : null}
          </div>
        ))}
      </div>
      <p className="bd-scaleveil__caption">{request?.caption ?? ''}</p>
      <p className="bd-caption">正在切换尺度与模型…</p>
    </div>
  );
}
