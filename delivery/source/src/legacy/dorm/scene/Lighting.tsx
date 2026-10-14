import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { C, toonProps } from '../theme';
import { ROOM } from '../game/state';

/** 统一做平滑过渡的小工具 */
function useDamp(ref: React.RefObject<THREE.Object3D | null>, night: boolean, onFrame: (t: number, dt: number) => void) {
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current = THREE.MathUtils.damp(t.current, night ? 1 : 0, 2.6, Math.min(dt, 0.05));
    onFrame(t.current, dt);
  });
}

/**
 * 看不见的"屋顶"：material.visible=false 所以不参与渲染，
 * 但 castShadow=true 仍会投影 —— 让阳光只能从窗户进入，
 * 形成有设计感的窗形光斑。
 */
function ShadowRoof() {
  return (
    <mesh position={[0, ROOM.height + 0.02, 0]} rotation-x={Math.PI / 2} castShadow>
      <planeGeometry args={[ROOM.maxX * 2 + 0.3, ROOM.maxZ * 2 + 0.3]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

/** 墙面壁灯（夜间点亮） */
function WallSconce({ night }: { night: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  const grp = useRef<THREE.Group>(null);
  useDamp(grp, night, (t) => {
    if (light.current) light.current.intensity = 4.2 * t;
    if (bulb.current) bulb.current.color.setRGB(0.6 + 0.4 * t, 0.55 + 0.45 * t, 0.45 + 0.55 * t);
  });
  return (
    <group position={[ROOM.minX + 0.02, 1.92, -0.62]} rotation-y={Math.PI / 2}>
      <group ref={grp}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.1, 0.16, 0.04]} />
          <meshToonMaterial {...toonProps(C.woodDark)} />
        </mesh>
        <mesh position={[0, 0.02, 0.13]} rotation-x={0.35}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshToonMaterial {...toonProps(C.woodDark)} />
        </mesh>
        <mesh position={[0, -0.06, 0.24]} castShadow>
          <coneGeometry args={[0.13, 0.16, 14, 1, true]} />
          <meshToonMaterial {...toonProps(C.lampShade)} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.09, 0.24]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshBasicMaterial ref={bulb} color="#8c8578" toneMapped={false} />
        </mesh>
        <pointLight ref={light} position={[0, -0.12, 0.28]} color="#ffd39a" distance={4.2} decay={2} intensity={0} />
      </group>
    </group>
  );
}

/** 光柱里的浮尘：缓慢环境动画，成本极低 */
function DustMotes({ night }: { night: boolean }) {
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const count = 110;
  const base = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let seed = 99;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = -0.5 + rnd() * 2.1;
      arr[i * 3 + 1] = 0.15 + rnd() * 1.9;
      arr[i * 3 + 2] = -1.95 + rnd() * 2.7;
    }
    return arr;
  }, []);
  const phase = useMemo(() => {
    const p = new Float32Array(count);
    let seed = 4242;
    for (let i = 0; i < count; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      p[i] = (seed / 0x7fffffff) * Math.PI * 2;
    }
    return p;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (mat.current) mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, night ? 0.06 : 0.42, 2.4, dt);
    const geo = pts.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const ph = phase[i];
      pos.setY(i, base[i * 3 + 1] + Math.sin(t * 0.22 + ph) * 0.16);
      pos.setX(i, base[i * 3] + Math.sin(t * 0.16 + ph * 1.7) * 0.12);
      pos.setZ(i, base[i * 3 + 2] + Math.cos(t * 0.12 + ph) * 0.1);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[base, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.028}
        sizeAttenuation
        color="#ffe9c4"
        transparent
        opacity={0.42}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Lighting({ mode }: { mode: 'day' | 'night' }) {
  const night = mode === 'night';
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const room = useRef<THREE.PointLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const anchor = useRef<THREE.Group>(null);

  useDamp(anchor, night, (t) => {
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(2.5, 0.42, t);
      sun.current.color.setHex(0xffd7a2).lerp(new THREE.Color(0x9fb4e0), t);
    }
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(0.42, 0.16, t);
    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.lerp(0.62, 0.3, t);
      hemi.current.color.setHex(0xcfe6f5).lerp(new THREE.Color(0x33456b), t);
      hemi.current.groundColor.setHex(0xe8d4b4).lerp(new THREE.Color(0x2a2622), t);
    }
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.lerp(0.34, 0.5, t);
      ambient.current.color.setHex(0xfff2e2).lerp(new THREE.Color(0x5f6b96), t);
    }
    if (room.current) room.current.intensity = 9 * t;
  });

  return (
    <group ref={anchor}>
      <ShadowRoof />
      <ambientLight ref={ambient} intensity={0.34} color="#fff2e2" />
      <hemisphereLight ref={hemi} intensity={0.62} color="#cfe6f5" groundColor="#e8d4b4" />
      {/* 主光：从窗外斜射进来的晨光 */}
      <directionalLight
        ref={sun}
        position={[5.1, 7.8, -12]}
        target-position={[0, 0, 0.5]}
        intensity={2.5}
        color="#ffd7a2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0006}
        shadow-normalBias={0.022}
      />
      {/* 室内补光，避免暗部死黑 */}
      <directionalLight ref={fill} position={[-4, 3.4, 5]} intensity={0.42} color="#c9dcf0" />
      {/* 夜间主照明（不可见光源，位置在天花板下方） */}
      <pointLight ref={room} position={[0.2, 2.45, 0.1]} intensity={0} distance={9} decay={2} color="#ffc98a" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
      <WallSconce night={night} />
      <DustMotes night={night} />
    </group>
  );
}
