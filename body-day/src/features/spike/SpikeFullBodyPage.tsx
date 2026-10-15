import { useCallback, useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { StageBoundary } from '../../components/StageBoundary';
import { FullBodyStage, type FullBodyProbe, type FullBodyStats } from '../../three/FullBodyStage';

/**
 * 整具人体拆解舞台的**临时验证入口**（路由 `/spike-full-body`）。
 *
 * 仅用于 Phase A/C 的技术取证：真实加载、真实位移、真实点选回读、真实帧率。
 * V2 集成进工作台后整页删除，不留任何产品路径。
 */

const PROBE_LABELS: Record<string, string> = {
  heart: '心脏 heart',
  cerebrum: '大脑 cerebrum',
  cerebellum: '小脑 cerebellum',
  brainstem: '脑干 brainstem',
  spleen: '脾脏 spleen',
};

function formatTriple(value: [number, number, number] | undefined): string {
  if (!value) return '—';
  return value.map((n) => n.toFixed(4)).join(', ');
}

export function SpikeFullBodyPage() {
  const [progress, setProgress] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [stats, setStats] = useState<FullBodyStats | null>(null);
  const [probe, setProbe] = useState<FullBodyProbe | null>(null);
  const loading = useProgress();

  const handleReady = useCallback((ready: FullBodyStats) => {
    setStats(ready);
    console.log('[BodyDay spike] 整具人体就绪：', JSON.stringify(ready));
  }, []);

  const handleProbe = useCallback((next: FullBodyProbe) => {
    setProbe(next);
    console.log('[BodyDay spike] 位移读数：', JSON.stringify(next));
  }, []);

  const focus = useCallback((id: string) => {
    setSelectedId(id);
    setFocusNonce((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    setSelectedId(null);
    setResetNonce((n) => n + 1);
  }, []);

  /* 给浏览器取证用的实时钩子：数值全部来自真实运行，不是页面常量 */
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__BODYDAY_SPIKE__ = {
      stats,
      probe,
      selectedId,
      hoveredId,
      progress,
      setProgress,
      focus,
      reset,
      setIsolate,
    };
  }, [stats, probe, selectedId, hoveredId, progress, focus, reset]);

  return (
    <div className="bd-container bd-page" style={{ maxWidth: 1180 }}>
      <p className="bd-caption" data-testid="spike-note">
        临时验证入口，V2 集成后删除 · /spike-full-body
      </p>
      <h1 style={{ fontSize: '1.1rem', margin: '4px 0 12px' }}>整具人体拆解舞台 · 技术验证</h1>

      <div style={{ display: 'flex', gap: 'var(--bd-space-5)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="bd-stage bd-stage--tall" style={{ flex: '1 1 620px', position: 'relative' }}>
          <StageBoundary label="整具人体拆解舞台">
            <FullBodyStage
              progress={progress}
              selectedStructureId={selectedId}
              onSelectStructure={setSelectedId}
              onHoverStructure={setHoveredId}
              focusNonce={focusNonce}
              resetNonce={resetNonce}
              isolate={isolate}
              onReady={handleReady}
              onProbe={handleProbe}
              ariaLabel="整具人体拆解三维模型"
            />
          </StageBoundary>

          {!stats ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background: 'color-mix(in srgb, var(--bd-paper) 92%, transparent)',
                zIndex: 5,
              }}
            >
              <div className="bd-state">
                <p className="bd-state__title">正在加载整具人体（30.4 MB）</p>
                <div className="bd-progress">
                  <div className="bd-progress__bar" style={{ width: `${loading.progress.toFixed(0)}%` }} />
                </div>
                <p className="bd-state__detail">
                  真实字节进度：{loading.loaded.toLocaleString()} / {loading.total.toLocaleString()} B（
                  {loading.progress.toFixed(1)}%）
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 'var(--bd-space-4)' }}>
          <section>
            <p className="bd-label">拆解进度</p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              data-testid="progress-slider"
              onChange={(event) => setProgress(Number(event.target.value))}
              style={{ width: '100%' }}
            />
            <p className="bd-caption" data-testid="progress-value">
              progress = {progress.toFixed(2)}
            </p>
          </section>

          <section className="bd-row">
            <button type="button" className="bd-button bd-button--sm" onClick={() => setProgress(0)}>
              0 · 组装
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={() => setProgress(0.5)}>
              0.5 · 部分拆解
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={() => setProgress(1)}>
              1 · 完全拆解
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={() => focus('heart')}>
              聚焦心脏
            </button>
            <button type="button" className="bd-button bd-button--sm" onClick={reset}>
              复位
            </button>
            <label className="bd-caption" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={isolate}
                data-testid="isolate-toggle"
                onChange={(event) => setIsolate(event.target.checked)}
              />
              隔离选中
            </label>
          </section>

          <section>
            <p className="bd-label">选中 / 悬停</p>
            <p className="bd-caption" data-testid="selected-id">
              selected = {selectedId ?? '（空）'}
            </p>
            <p className="bd-caption" data-testid="hovered-id">
              hovered = {hoveredId ?? '（空）'}
            </p>
          </section>

          <section>
            <p className="bd-label">真实加载统计</p>
            <dl className="bd-knowledge__facts">
              <Stat label="唯一 anatomyId" testId="stat-unique" value={stats ? String(stats.uniqueAnatomyIds) : '—'} />
              <Stat label="节点数" testId="stat-nodes" value={stats ? String(stats.nodeCount) : '—'} />
              <Stat label="网格数" testId="stat-mesh" value={stats ? String(stats.meshCount) : '—'} />
              <Stat label="三角形数" testId="stat-triangles" value={stats ? stats.triangleCount.toLocaleString() : '—'} />
              <Stat label="就绪耗时" testId="stat-loadms" value={stats ? `${stats.loadMs} ms` : '—'} />
              <Stat label="sample anatomyId" testId="stat-sample-id" value={stats?.sampleAnatomyId ?? '—'} />
              <Stat
                label="sample anatomyParentId"
                testId="stat-sample-parent"
                value={stats?.sampleAnatomyParentId ?? '（null）'}
              />
              <Stat
                label="sample anatomySystem"
                testId="stat-sample-system"
                value={stats?.sampleAnatomySystem ?? '（null）'}
              />
              <Stat
                label="userData keys"
                testId="stat-userdata-keys"
                value={stats ? stats.sampleUserDataKeys.join(', ') : '—'}
              />
            </dl>
          </section>

          <section>
            <p className="bd-label">器官分组网格数（含自身网格）</p>
            {Object.entries(PROBE_LABELS).map(([id, label]) => (
              <p key={id} className="bd-caption" data-testid={`group-${id}`}>
                {label} = {stats ? (stats.groupCounts[id] ?? 0) : '—'}
              </p>
            ))}
          </section>

          <section>
            <p className="bd-label">位移读数（当前 progress 下的包围盒中心）</p>
            {Object.keys(PROBE_LABELS).map((id) => (
              <p key={id} className="bd-caption" data-testid={`center-${id}`}>
                {id}: {formatTriple(probe?.centers[id])}
              </p>
            ))}
            <p className="bd-caption" data-testid="radii">
              radii:{' '}
              {probe
                ? Object.entries(probe.radii)
                    .map(([id, value]) => `${id}=${value.toFixed(4)}`)
                    .join(' · ')
                : '—'}
            </p>
          </section>

          <p className="bd-caption">
            模型来源：Vanatome Human Atlas 1.4.0 · Z-Anatomy（CC BY-SA 4.0）。
            本页在浏览器中直接从 CDN 加载，仓库不包含该 30.4 MB 资产。
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, testId, value }: { label: string; testId: string; value: string }) {
  return (
    <div className="bd-knowledge__fact">
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
}
