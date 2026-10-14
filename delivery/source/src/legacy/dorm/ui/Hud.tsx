import { useProgress } from '@react-three/drei';
import './hud.css';
import { INTERACT_POINTS, type InteractId } from '../game/layout';

export type DialogKind = 'none' | 'bath' | 'exit';

function Stat({ name, value, mind }: { name: string; value: number; mind?: boolean }) {
  return (
    <div className="stat-row">
      <span className="stat-name">{name}</span>
      <span className="stat-track">
        <span className={`stat-fill${mind ? ' mind' : ''}`} style={{ width: `${value}%` }} />
      </span>
      <span className="stat-value">{value}/100</span>
    </div>
  );
}

const LABELS: Record<string, string> = {
  bathroom: '卫生间门',
  exit: '寝室出口',
};

export function Hud({
  mode,
  onToggleMode,
  near,
  dialog,
  onOpen,
  onClose,
  toast,
}: {
  mode: 'day' | 'night';
  onToggleMode: () => void;
  near: InteractId | null;
  dialog: DialogKind;
  onOpen: (id: InteractId) => void;
  onClose: (note?: string) => void;
  toast: string | null;
}) {
  const { active, progress } = useProgress();
  const night = mode === 'night';
  const point = INTERACT_POINTS.find((p) => p.id === near);

  return (
    <div className="hud" data-mode={mode}>
      <div className="panel clock">
        <div className="clock-time">{night ? '23:10' : '08:30'}</div>
        <div className="clock-meta">{night ? '寝室 · 深夜' : '寝室 · 清晨'}</div>
      </div>

      <div className="panel stats">
        <Stat name="生理状态" value={80} />
        <Stat name="心理状态" value={80} mind />
      </div>

      <div className="hints">
        <span className="hint">
          <span className="keycap">WASD</span>移动
        </span>
        <span className="hint">
          <span className="keycap">拖拽</span>转视角
        </span>
        <span className="hint">
          <span className="keycap">滚轮</span>远近
        </span>
        <span className="hint">
          <span className="keycap">E</span>交互
        </span>
        <span className="hint">
          <span className="keycap">T</span>昼夜
        </span>
      </div>

      <button className="toggle" onClick={onToggleMode}>
        <span className="toggle-dot" />
        {night ? '切换到白天' : '切换到夜晚'}
      </button>

      {point && dialog === 'none' && (
        <div className="prompt">
          <span className="keycap">E</span>
          按 E 交互 · {LABELS[point.id]}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {dialog !== 'none' && (
        <div className="mask">
          {dialog === 'bath' ? (
            <div className="modal">
              <div className="modal-tag">卫生间门 · 洗漱</div>
              <div className="modal-title">要刷牙吗？</div>
              <div className="modal-text">嗯……出门前，要不要先刷个牙呢。</div>
              <div className="modal-actions">
                <button className="btn primary" onClick={() => onClose('好的，认真刷牙 3 分钟。')}>
                  刷牙
                </button>
                <button className="btn" onClick={() => onClose('算了，直接出门。')}>
                  不刷牙
                </button>
              </div>
            </div>
          ) : (
            <div className="modal">
              <div className="modal-tag">寝室出口</div>
              <div className="modal-title">准备前往食堂</div>
              <div className="modal-text">推开门，走廊尽头就是食堂的早餐档口。</div>
              <div className="modal-actions">
                <button className="btn primary" onClick={() => onOpen('exit')}>
                  确认出发
                </button>
                <button className="btn" onClick={() => onClose()}>
                  留在寝室
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(active || progress < 100) && (
        <div className="loading">
          <div className="loading-card">
            <div className="loading-title">正在布置寝室</div>
            <div className="loading-bar">
              <div className="loading-fill" style={{ width: `${Math.round(progress)}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
