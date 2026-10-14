import { Suspense, useCallback, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 器官 / 细胞层的统一舞台。
 *
 * 关键工程决策：
 * - 舞台自带 Canvas，路由级切换保证**同一时刻只有一个活跃 WebGL 场景**；
 * - 背景透明，露出暖白纸面 CSS 渐变，保持低密度、大主角的视觉立场；
 * - 结构热点是**普通 DOM + 每帧投影**，不使用库的隐式剔除：
 *   保证每一个标注都可点击、可 Tab 聚焦、可被读屏朗读，
 *   也不会因为视锥判断而在默认机位下凭空消失。
 */

type ControlsLike = {
  target: THREE.Vector3;
  update: () => void;
  enabled: boolean;
};

export interface StageHotspot {
  /** 模型侧 ID（用于渲染与命中） */
  modelId: string;
  /** 领域实体 ID（用于知识联动） */
  entityId: string;
  label: string;
  position: [number, number, number];
}

export interface ModelStageProps {
  children: ReactNode;
  hotspots?: StageHotspot[];
  selectedId?: string | null;
  onSelectHotspot?: (entityId: string) => void;
  onHoverHotspot?: (entityId: string | null) => void;
  /** 聚焦请求：发生变化时把镜头推进到对应热点 */
  focusRequest?: { entityId: string; nonce: number } | null;
  /** 复位请求：发生变化时回到默认机位 */
  resetNonce?: number;
  /** 用户开始拖动模型（用于课程步骤「转动模型」的完成判定） */
  onUserRotate?: () => void;
  /** 默认机位距离 */
  defaultDistance?: number;
  ariaLabel?: string;
  canvasKey?: string;
}

/** 默认机位由 defaultDistance 推导，保证「初始取景」与「复位」用的是同一个终点 */
function defaultCamera(defaultDistance: number): [number, number, number] {
  return [0, defaultDistance * 0.18, defaultDistance * 0.98];
}

/** 每帧把 3D 锚点投影到 DOM 热点；不触发 React 重渲染 */
function HotspotProjector({
  hotspots,
  targetsRef,
}: {
  hotspots: StageHotspot[];
  targetsRef: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const { camera, size } = useThree();
  const projected = useRef(new THREE.Vector3());

  useFrame(() => {
    for (let i = 0; i < hotspots.length; i += 1) {
      const element = targetsRef.current?.[i];
      if (!element) continue;
      const hotspot = hotspots[i];
      projected.current.set(hotspot.position[0], hotspot.position[1], hotspot.position[2]);
      projected.current.project(camera);
      const x = (projected.current.x * 0.5 + 0.5) * size.width;
      const y = (-projected.current.y * 0.5 + 0.5) * size.height;
      const behind = projected.current.z > 1;
      element.style.left = `${x.toFixed(1)}px`;
      element.style.top = `${y.toFixed(1)}px`;
      element.dataset.behind = behind ? 'true' : 'false';
    }
  });

  return null;
}

function FocusRig({
  controlsRef,
  focusRequest,
  resetNonce,
  hotspots,
  defaultDistance,
}: {
  controlsRef: RefObject<ControlsLike | null>;
  focusRequest?: { entityId: string; nonce: number } | null;
  resetNonce?: number;
  hotspots: StageHotspot[];
  defaultDistance: number;
}) {
  const { camera } = useThree();
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const focusKey = focusRequest ? `${focusRequest.entityId}#${focusRequest.nonce}` : '';
  useMemo(() => {
    if (!focusRequest) return;
    const hotspot = hotspots.find((h) => h.entityId === focusRequest.entityId);
    const target = hotspot ? new THREE.Vector3(...hotspot.position) : new THREE.Vector3(0, 0, 0);
    const direction = camera.position.clone().sub(target);
    if (direction.lengthSq() < 1e-6) direction.set(0, 0.6, 1);
    direction.normalize();
    goal.current = {
      position: target.clone().add(direction.multiplyScalar(defaultDistance * 0.62)),
      target,
    };
  }, [focusKey]);

  useMemo(() => {
    if (resetNonce === undefined) return;
    goal.current = {
      position: new THREE.Vector3(...defaultCamera(defaultDistance)),
      target: new THREE.Vector3(0, 0, 0),
    };
  }, [resetNonce, defaultDistance]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !goal.current) return;
    const k = 1 - Math.pow(0.0015, Math.min(delta, 0.1));
    camera.position.lerp(goal.current.position, k);
    controls.target.lerp(goal.current.target, k);
    controls.update();
    if (camera.position.distanceTo(goal.current.position) < 0.015) {
      camera.position.copy(goal.current.position);
      controls.target.copy(goal.current.target);
      controls.update();
      goal.current = null;
    }
  });

  return null;
}

export function ModelStage({
  children,
  hotspots = [],
  selectedId = null,
  onSelectHotspot,
  onHoverHotspot,
  focusRequest = null,
  resetNonce,
  onUserRotate,
  defaultDistance = 4.2,
  ariaLabel,
  canvasKey,
}: ModelStageProps) {
  const controlsRef = useRef<ControlsLike | null>(null);
  const hotspotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const reduced = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const handleRef = useCallback((index: number) => (element: HTMLButtonElement | null) => {
    hotspotRefs.current[index] = element;
  }, []);

  return (
    <div className="bd-stage__canvas" aria-label={ariaLabel} role="group">
      <Canvas
        key={canvasKey}
        frameloop="always"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: defaultCamera(defaultDistance), fov: 38, near: 0.05, far: 120 }}
        performance={{ min: 0.6 }}
      >
        <ambientLight intensity={0.72} />
        <hemisphereLight args={['#fdfbf7', '#e8e4dc', 0.55]} />
        <directionalLight position={[4, 6, 5]} intensity={1.25} color="#fffaf0" />
        <directionalLight position={[-5, 2, -4]} intensity={0.42} color="#e9eef5" />

        <Suspense fallback={null}>{children}</Suspense>

        <HotspotProjector hotspots={hotspots} targetsRef={hotspotRefs} />

        <OrbitControls
          ref={controlsRef as never}
          makeDefault
          enablePan
          enableDamping={!reduced}
          dampingFactor={0.08}
          rotateSpeed={0.8}
          zoomSpeed={0.75}
          minDistance={1.2}
          maxDistance={Math.max(11, defaultDistance * 3)}
          onStart={() => onUserRotate?.()}
        />

        <FocusRig
          controlsRef={controlsRef}
          focusRequest={focusRequest}
          resetNonce={resetNonce}
          hotspots={hotspots}
          defaultDistance={defaultDistance}
        />
      </Canvas>

      <div className="bd-hotspot-layer">
        {hotspots.map((hotspot, index) => (
          <button
            key={hotspot.modelId}
            ref={handleRef(index)}
            type="button"
            className="bd-hotspot"
            data-active={selectedId === hotspot.entityId}
            aria-pressed={selectedId === hotspot.entityId}
            onMouseEnter={() => onHoverHotspot?.(hotspot.entityId)}
            onMouseLeave={() => onHoverHotspot?.(null)}
            onFocus={() => onHoverHotspot?.(hotspot.entityId)}
            onBlur={() => onHoverHotspot?.(null)}
            onClick={() => onSelectHotspot?.(hotspot.entityId)}
          >
            <span className="bd-hotspot__dot" aria-hidden="true" />
            {hotspot.label}
          </button>
        ))}
      </div>
    </div>
  );
}
