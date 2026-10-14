import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { C, toonProps } from '../theme';

function skyTexture(night: boolean): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  if (night) {
    g.addColorStop(0, C.skyNightTop);
    g.addColorStop(0.55, '#1d2846');
    g.addColorStop(1, C.skyNightBottom);
  } else {
    g.addColorStop(0, C.skyDayTop);
    g.addColorStop(0.62, '#dceef2');
    g.addColorStop(1, C.skyDayBottom);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  if (night) {
    // 星空（固定种子，保证刷新后一致）
    let seed = 20261014;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 190; i++) {
      const x = rnd() * 1024;
      const y = rnd() * 330;
      const r = 0.7 + rnd() * 1.5;
      ctx.globalAlpha = 0.28 + rnd() * 0.7;
      ctx.fillStyle = rnd() > 0.85 ? '#ffe6bf' : '#eef3ff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // 白天的薄云带
    let seed = 777;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 22; i++) {
      const x = rnd() * 1024;
      const y = 60 + rnd() * 250;
      const w = 40 + rnd() * 120;
      ctx.globalAlpha = 0.16 + rnd() * 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let day: THREE.CanvasTexture | null = null;
let night: THREE.CanvasTexture | null = null;
function sharedSky(n: boolean) {
  if (n) return (night ??= skyTexture(true));
  return (day ??= skyTexture(false));
}

function Tree({ x, z, s, night }: { x: number; z: number; s: number; night: boolean }) {
  const trunk = night ? '#2a2420' : '#8a6244';
  const leaf1 = night ? C.treeNight : C.treeDay;
  const leaf2 = night ? C.treeNightAlt : C.treeDayAlt;
  return (
    <group position={[x, -0.55, z]} scale={s}>
      <mesh position={[0, 0.7, 0]} castShadow={false}>
        <cylinderGeometry args={[0.13, 0.18, 1.4, 8]} />
        <meshToonMaterial {...toonProps(trunk)} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow={false}>
        <coneGeometry args={[1.05, 1.7, 9]} />
        <meshToonMaterial {...toonProps(leaf1)} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow={false}>
        <coneGeometry args={[0.78, 1.5, 9]} />
        <meshToonMaterial {...toonProps(leaf2)} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow={false}>
        <coneGeometry args={[0.5, 1.2, 9]} />
        <meshToonMaterial {...toonProps(leaf1)} />
      </mesh>
    </group>
  );
}

function Building({ x, z, w, h, d, night }: { x: number; z: number; w: number; h: number; d: number; night: boolean }) {
  const windows: Array<[number, number]> = [];
  const cols = Math.max(2, Math.floor(w / 0.9));
  const rows = Math.max(2, Math.floor(h / 0.9));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let seed = (x * 131 + z * 977 + c * 17 + r * 29) | 0;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if ((seed / 0x7fffffff) > 0.42) windows.push([c, r]);
    }
  }
  return (
    <group position={[x, -0.55, z]}>
      <mesh position={[0, h / 2, 0]} castShadow={false}>
        <boxGeometry args={[w, h, d]} />
        <meshToonMaterial {...toonProps(night ? C.buildingNight : C.buildingDay)} />
      </mesh>
      <group position={[0, 0, d / 2 + 0.02]}>
        {windows.map(([c, r], i) => (
          <mesh key={i} position={[(c - (cols - 1) / 2) * 0.9, 0.7 + r * 0.9, 0]}>
            <planeGeometry args={[0.34, 0.42]} />
            <meshBasicMaterial color={night ? '#ffd79a' : '#efe6d4'} toneMapped={false} transparent opacity={night ? 0.95 : 0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Clouds({ night }: { night: boolean }) {
  const g = useRef<THREE.Group>(null);
  const data = [
    [-9, 11.5, -16, 3.2],
    [2, 13.2, -20, 4.4],
    [10, 10.4, -14, 2.6],
    [-3, 14.6, -24, 5.2],
  ];
  useFrameDrift(g, night);
  return (
    <group ref={g}>
      {data.map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} scale={s}>
          <mesh>
            <sphereGeometry args={[1, 12, 8]} />
            <meshToonMaterial color={night ? '#2b3550' : '#ffffff'} transparent opacity={night ? 0.55 : 0.85} />
          </mesh>
          <mesh position={[1.1, -0.18, 0.1]} scale={0.72}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshToonMaterial color={night ? '#28314a' : '#ffffff'} transparent opacity={night ? 0.45 : 0.8} />
          </mesh>
          <mesh position={[-1.05, -0.2, -0.1]} scale={0.62}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshToonMaterial color={night ? '#28314a' : '#ffffff'} transparent opacity={night ? 0.45 : 0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 云缓慢飘动，超出范围后回卷 */
function useFrameDrift(ref: React.RefObject<THREE.Group | null>, night: boolean) {
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * (night ? 0.16 : 0.26);
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i];
      const base = [-9, 2, 10, -3][i] ?? 0;
      c.position.x = ((base + t) % 34) - 8;
    }
  });
}

export function Outside({ mode }: { mode: 'day' | 'night' }) {
  const night = mode === 'night';
  return (
    <group>
      {/* 天空穹幕 */}
      <mesh position={[0, 8, -34]}>
        <planeGeometry args={[130, 62]} />
        <meshBasicMaterial map={sharedSky(night)} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 8, 34]} rotation-y={Math.PI}>
        <planeGeometry args={[130, 62]} />
        <meshBasicMaterial map={sharedSky(night)} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* 室外地面（寝室坐落在草坡地台上） */}
      <mesh position={[0, -0.55, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshToonMaterial {...toonProps(night ? C.grassNight : C.grassDay)} />
      </mesh>

      {/* 太阳 / 月亮 */}
      <mesh position={[5.1, 7.8, -12]}>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshBasicMaterial color={night ? C.moon : C.sunGlow} toneMapped={false} />
      </mesh>
      <mesh position={[5.1, 7.8, -12]}>
        <sphereGeometry args={[1.5, 16, 12]} />
        <meshBasicMaterial color={night ? '#8fa6d6' : '#ffe0a3'} transparent opacity={0.22} toneMapped={false} />
      </mesh>

      {/* 远处树木 */}
      <Tree x={1.6} z={-7} s={1.15} night={night} />
      <Tree x={-2.6} z={-9} s={1.35} night={night} />
      <Tree x={4.6} z={-10.5} s={1.05} night={night} />
      <Tree x={-6.2} z={-13} s={1.5} night={night} />
      <Tree x={7.4} z={-16} s={1.25} night={night} />
      <Tree x={-9.4} z={-18} s={1.6} night={night} />
      <Tree x={2.2} z={-21} s={1.4} night={night} />

      {/* 远处建筑剪影 */}
      <Building x={-13} z={-24} w={5} h={6.5} d={5} night={night} />
      <Building x={-6} z={-28} w={6} h={9} d={5} night={night} />
      <Building x={2.5} z={-26} w={4.5} h={5.2} d={4} night={night} />

      <Clouds night={night} />
    </group>
  );
}
