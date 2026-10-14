import { Outlines, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { C, toonProps } from '../theme';
import { resolveCollision } from '../game/collision';
import { camera, game, keys, player } from '../game/state';

const OT = 0.01;
const WALK = 1.95;
const RUN = 3.3;

function Limb({
  color,
  len,
  r,
  position,
  groupRef,
  foot,
  hand,
}: {
  color: string;
  len: number;
  r: number;
  position: [number, number, number];
  groupRef: React.RefObject<THREE.Group | null>;
  /** 末端鞋体尺寸（腿部） */
  foot?: [number, number, number];
  /** 末端手（手臂） */
  hand?: string;
}) {
  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <capsuleGeometry args={[r, len - r * 2, 6, 12]} />
        <meshToonMaterial {...toonProps(color)} />
      </mesh>
      {foot && (
        <mesh position={[0, -len + foot[1] / 2 + 0.01, 0.04]} castShadow>
          <RoundedBox args={foot} radius={0.04} smoothness={3}>
            <meshToonMaterial {...toonProps(C.shoes)} />
            <Outlines thickness={OT} color={C.outline} />
          </RoundedBox>
        </mesh>
      )}
      {hand && (
        <mesh position={[0, -len - 0.01, 0]} castShadow>
          <sphereGeometry args={[0.062, 10, 8]} />
          <meshToonMaterial {...toonProps(hand)} />
        </mesh>
      )}
    </group>
  );
}

export function Character() {
  const root = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const facing = useRef(Math.PI);
  const amount = useRef(0);

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = clock.elapsedTime;

    // —— 输入 → 相机相对方向 ——
    const fwd = game.dialogOpen ? 0 : (keys.w || keys.arrowUp ? 1 : 0) - (keys.s || keys.arrowDown ? 1 : 0);
    const side = game.dialogOpen ? 0 : (keys.d || keys.arrowRight ? 1 : 0) - (keys.a || keys.arrowLeft ? 1 : 0);
    let dx = -Math.sin(camera.yaw) * fwd + Math.cos(camera.yaw) * side;
    let dz = -Math.cos(camera.yaw) * fwd - Math.sin(camera.yaw) * side;
    const mag = Math.hypot(dx, dz);

    if (mag > 0.001) {
      dx /= mag;
      dz /= mag;
      const speed = keys.run ? RUN : WALK;
      const nx = player.x + dx * speed * dt;
      const nz = player.z + dz * speed * dt;
      const solved = resolveCollision(nx, nz);
      player.x = solved.x;
      player.z = solved.z;
      player.facing = Math.atan2(dx, dz);
      player.moving = true;
      amount.current = THREE.MathUtils.damp(amount.current, 1, 9, dt);
      phase.current += dt * (keys.run ? 12.5 : 9.2);
    } else {
      player.moving = false;
      amount.current = THREE.MathUtils.damp(amount.current, 0, 7, dt);
      phase.current += dt * 2.2;
    }
    player.moveAmount = amount.current;

    // —— 朝向平滑（走最短弧） ——
    let diff = player.facing - facing.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facing.current += diff * Math.min(1, dt * 11);

    const g = root.current;
    if (!g) return;
    g.position.set(player.x, 0, player.z);
    g.rotation.y = facing.current;

    // —— 走步 / 待机动画 ——
    const a = amount.current;
    const walk = Math.sin(phase.current);
    const idle = Math.sin(t * 1.5);

    if (legL.current) legL.current.rotation.x = walk * 0.52 * a;
    if (legR.current) legR.current.rotation.x = -walk * 0.52 * a;
    if (armL.current) armL.current.rotation.x = -walk * 0.44 * a + idle * 0.05 * (1 - a);
    if (armR.current) armR.current.rotation.x = walk * 0.44 * a + idle * 0.05 * (1 - a);
    if (armL.current) armL.current.rotation.z = 0.08 + a * 0.03;
    if (armR.current) armR.current.rotation.z = -0.08 - a * 0.03;
    if (bob.current) {
      bob.current.position.y = Math.abs(Math.sin(phase.current)) * 0.045 * a + idle * 0.012 * (1 - a);
      bob.current.rotation.x = 0.07 * a;
      bob.current.rotation.z = Math.sin(phase.current) * 0.02 * a;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.7) * 0.09 * (1 - a);
      head.current.rotation.x = -Math.sin(phase.current * 2) * 0.025 * a;
    }
  });

  return (
    <group ref={root}>
      <group ref={bob}>
        {/* 双腿 + 鞋 */}
        <Limb groupRef={legL} color={C.pants} len={0.82} r={0.088} position={[-0.11, 0.86, 0]} foot={[0.14, 0.1, 0.26]} />
        <Limb groupRef={legR} color={C.pants} len={0.82} r={0.088} position={[0.11, 0.86, 0]} foot={[0.14, 0.1, 0.26]} />

        {/* 躯干（连帽衫） */}
        <group position={[0, 1.06, 0]}>
          <RoundedBox args={[0.36, 0.5, 0.24]} radius={0.1} smoothness={4} castShadow>
            <meshToonMaterial {...toonProps(C.hoodie)} />
            <Outlines thickness={OT} color={C.outline} />
          </RoundedBox>
          {/* 连帽衫口袋 */}
          <RoundedBox args={[0.22, 0.13, 0.06]} radius={0.03} smoothness={3} position={[0, -0.13, 0.12]} castShadow>
            <meshToonMaterial {...toonProps(C.hoodieDark)} />
          </RoundedBox>
          {/* 帽子 */}
          <mesh position={[0, 0.16, -0.13]} rotation-x={0.5} scale={[1, 0.85, 0.8]} castShadow>
            <sphereGeometry args={[0.15, 12, 10]} />
            <meshToonMaterial {...toonProps(C.hoodieDark)} />
          </mesh>
          {/* 领口 */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.1, 0.07, 12]} />
            <meshToonMaterial {...toonProps(C.hoodieDark)} />
          </mesh>
        </group>

        {/* 双臂 + 手 */}
        <Limb groupRef={armL} color={C.hoodie} len={0.58} r={0.072} position={[-0.215, 1.24, 0]} hand={C.skin} />
        <Limb groupRef={armR} color={C.hoodie} len={0.58} r={0.072} position={[0.215, 1.24, 0]} hand={C.skin} />

        {/* 头部 */}
        <group ref={head} position={[0, 1.36, 0]}>
          <mesh position={[0, 0.13, 0]} castShadow>
            <sphereGeometry args={[0.145, 16, 14]} />
            <meshToonMaterial {...toonProps(C.skin)} />
            <Outlines thickness={OT} color={C.outline} />
          </mesh>
          {/* 头发 */}
          <mesh position={[0, 0.16, -0.01]} scale={[1.04, 1.02, 1.04]} castShadow>
            <sphereGeometry args={[0.145, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshToonMaterial {...toonProps(C.hair)} />
            <Outlines thickness={OT} color={C.outline} />
          </mesh>
          <mesh position={[0, 0.12, -0.11]} scale={[1, 0.9, 0.9]} castShadow>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshToonMaterial {...toonProps(C.hair)} />
          </mesh>
          {/* 眼睛 */}
          <mesh position={[-0.052, 0.13, 0.125]} rotation-x={0.1}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshToonMaterial {...toonProps(C.eye)} />
          </mesh>
          <mesh position={[0.052, 0.13, 0.125]} rotation-x={0.1}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshToonMaterial {...toonProps(C.eye)} />
          </mesh>
        </group>
      </group>

      {/* 接地阴影贴片：让角色站在地上更"实" */}
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.3, 20]} />
        <meshBasicMaterial color="#4a3226" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
