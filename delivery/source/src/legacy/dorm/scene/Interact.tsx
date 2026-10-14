import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { toonProps, C } from '../theme';
import { INTERACT_POINTS, type InteractId } from '../game/layout';
import { game, player } from '../game/state';

/**
 * 交互点探测：只在"进入/离开"时回调一次，避免每帧触发 React 更新。
 * 同时在门口浮起一个小标记，提示这里可以交互。
 */
export function Interact({ onNear }: { onNear: (id: InteractId | null) => void }) {
  const markers = useRef<Record<string, THREE.Group | null>>({});

  useFrame(({ clock }) => {
    let best: InteractId | null = null;
    let bestDist = Infinity;
    for (const p of INTERACT_POINTS) {
      const d = Math.hypot(player.x - p.x, player.z - p.z);
      if (d < p.radius && d < bestDist) {
        bestDist = d;
        best = p.id;
      }
    }
    if (best !== game.nearInteract) {
      game.nearInteract = best;
      onNear(best);
    }
    // 标记随距离浮起，靠近时更明显
    for (const p of INTERACT_POINTS) {
      const g = markers.current[p.id];
      if (!g) continue;
      const d = Math.hypot(player.x - p.x, player.z - p.z);
      const near = d < p.radius * 1.35 ? 1 : 0.35;
      g.visible = true;
      const s = THREE.MathUtils.damp(g.scale.x, near, 6, 0.016);
      g.scale.setScalar(s);
      g.position.y = 1.32 + Math.sin(clock.elapsedTime * 2.2 + (p.id === 'exit' ? 1 : 0)) * 0.05;
    }
  });

  return (
    <group>
      {INTERACT_POINTS.map((p) => (
        <group
          key={p.id}
          position={[p.id === 'bathroom' ? p.x + 0.32 : p.x, 1.32, p.id === 'bathroom' ? p.z : p.z + 0.28]}
          ref={(el) => {
            markers.current[p.id] = el;
          }}
        >
          <mesh rotation-y={Math.PI / 4}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshToonMaterial {...toonProps(C.amber)} />
          </mesh>
          <mesh position={[0, -0.11, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[0.05, 0.09, 4]} />
            <meshToonMaterial {...toonProps(C.terracotta)} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
