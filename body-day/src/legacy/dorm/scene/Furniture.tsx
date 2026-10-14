import { Outlines, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { C, sharedScreenTexture, toonProps } from '../theme';
import { LAYOUT } from '../game/layout';
import { Prop } from './Prop';
import { MODELS } from './models';

const OT = 0.009;
const BED_TOP = 0.42;
const DESK_TOP = LAYOUT.deskTopY;

/** 显示器：程序化建模，屏幕单独做自发光，是夜间剧情复用的关键道具 */
function Monitor({ night }: { night: boolean }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);
  const t = useRef(night ? 1 : 0);
  const tex = sharedScreenTexture();

  useFrame((_, dt) => {
    const target = night ? 1 : 0;
    t.current = THREE.MathUtils.damp(t.current, target, 3.2, dt);
    if (screen.current) {
      screen.current.color.setRGB(
        0.34 + 0.66 * t.current,
        0.36 + 0.64 * t.current,
        0.42 + 0.58 * t.current,
      );
    }
    if (glow.current) glow.current.intensity = 0.4 + 5.4 * t.current;
  });

  return (
    <group position={[-0.86, DESK_TOP, -1.97]}>
      {/* 底座 + 支架 */}
      <RoundedBox args={[0.3, 0.035, 0.19]} radius={0.015} smoothness={3} position={[0, 0.018, 0]} castShadow>
        <meshToonMaterial {...toonProps(C.woodDark)} />
      </RoundedBox>
      <mesh position={[0, 0.15, -0.01]} castShadow>
        <boxGeometry args={[0.07, 0.26, 0.055]} />
        <meshToonMaterial {...toonProps(C.woodDark)} />
      </mesh>
      {/* 屏幕外壳 */}
      <RoundedBox args={[0.58, 0.37, 0.038]} radius={0.02} smoothness={3} position={[0, 0.42, 0]} castShadow>
        <meshToonMaterial {...toonProps(C.woodDark)} />
        <Outlines thickness={OT} color={C.outline} />
      </RoundedBox>
      {/* 屏幕发光面 */}
      <mesh position={[0, 0.42, 0.022]}>
        <planeGeometry args={[0.53, 0.32]} />
        <meshBasicMaterial ref={screen} map={tex} toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position={[0, 0.42, 0.45]} color="#8fc4ff" distance={2.6} decay={2} intensity={0.4} />
    </group>
  );
}

function Bed() {
  const B_ = LAYOUT.bed;
  const w = 0.57 * B_.scale; // 床宽
  const len = 1.13 * B_.scale; // 床长（沿 Z）
  const footZ = B_.cz + len / 2;
  const duvetLen = len * 0.68;
  const duvetZ = footZ - duvetLen / 2;
  return (
    <group>
      {/* Kenney 床自带的珊瑚红软垫按项目色板重着色，避免跳色 */}
      <Prop
        url={MODELS.bed}
        position={[B_.cx, 0, B_.cz]}
        rotationY={B_.rotY}
        scale={B_.scale}
        recolor={{ carpet: C.sage, metal: C.pillow, wood: '#b5825a' }}
      />

      {/* 被子：盖住床尾三分之二 */}
      <group position={[B_.cx, 0, duvetZ]}>
        <RoundedBox
          args={[w + 0.06, 0.15, duvetLen]}
          radius={0.055}
          smoothness={4}
          position={[0, BED_TOP + 0.03, 0]}
          castShadow
          receiveShadow
        >
          <meshToonMaterial {...toonProps(C.duvet)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        {/* 被沿翻折 */}
        <RoundedBox
          args={[w + 0.06, 0.08, 0.22]}
          radius={0.032}
          smoothness={4}
          position={[0, BED_TOP + 0.08, -duvetLen / 2 + 0.11]}
          castShadow
        >
          <meshToonMaterial {...toonProps(C.duvetFold)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        {/* 床尾垂下来的被角 */}
        <RoundedBox
          args={[0.26, 0.36, 0.16]}
          radius={0.045}
          smoothness={3}
          position={[w / 2 - 0.04, BED_TOP - 0.16, duvetLen / 2 - 0.26]}
          castShadow
        >
          <meshToonMaterial {...toonProps(C.duvet)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        {/* 靠枕（项目自建，统一色板） */}
        <RoundedBox
          args={[0.42, 0.15, 0.4]}
          radius={0.07}
          smoothness={4}
          position={[0.13, BED_TOP + 0.11, -duvetLen / 2 + 0.38]}
          rotation-y={0.34}
          castShadow
        >
          <meshToonMaterial {...toonProps(C.terracotta)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
      </group>

      {/* 床上随手放的笔记本电脑 */}
      <Prop
        url={MODELS.laptop}
        position={[B_.cx + 0.06, BED_TOP + 0.1, duvetZ + 0.42]}
        rotationY={1.1}
        scale={1.3}
      />
    </group>
  );
}

function Desk({ night }: { night: boolean }) {
  const D = LAYOUT.desk;
  return (
    <group>
      <Prop url={MODELS.desk} position={[D.cx, 0, D.cz]} rotationY={D.rotY} scale={D.scale} />
      <Prop
        url={MODELS.chair}
        position={[LAYOUT.chair.cx, 0, LAYOUT.chair.cz]}
        rotationY={LAYOUT.chair.rotY}
        scale={LAYOUT.chair.scale}
        recolor={{ carpet: '#e0a24a', metalMedium: '#8a9a9a' }}
      />

      <Monitor night={night} />
      {/* 键盘 / 鼠标 */}
      <Prop url={MODELS.keyboard} position={[-0.95, DESK_TOP, -1.6]} scale={1.55} />
      <Prop url={MODELS.mouse} position={[-0.44, DESK_TOP, -1.58]} rotationY={-0.4} scale={1.6} />
      {/* 台灯 */}
      <group position={[-0.24, DESK_TOP, -1.95]}>
        <Prop url={MODELS.lampTable} position={[0, 0, 0]} rotationY={-0.5} scale={1.6} />
      </group>
      {/* 书本 + 马克杯 */}
      <Prop url={MODELS.books} position={[-1.34, DESK_TOP, -1.92]} rotationY={0.5} scale={1.6} />
      <Prop url={MODELS.books} position={[-1.3, DESK_TOP + 0.13, -1.9]} rotationY={-0.25} scale={1.35} />
      <group position={[-1.16, DESK_TOP, -1.5]}>
        <mesh position={[0, 0.055, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.038, 0.11, 12]} />
          <meshToonMaterial {...toonProps(C.mug)} />
          <Outlines thickness={0.006} color={C.outline} />
        </mesh>
        <mesh position={[0.05, 0.06, 0]} castShadow>
          <torusGeometry args={[0.028, 0.009, 6, 10, Math.PI]} />
          <meshToonMaterial {...toonProps(C.mug)} />
        </mesh>
      </group>
    </group>
  );
}

/** 桌面台灯在夜间点亮的那团光 */
function DeskLampLight({ night }: { night: boolean }) {
  const l = useRef<THREE.PointLight>(null);
  const s = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current = THREE.MathUtils.damp(t.current, night ? 1 : 0, 3.2, dt);
    if (l.current) l.current.intensity = 6.5 * t.current;
    if (s.current) s.current.color.setRGB(0.55 + 0.45 * t.current, 0.5 + 0.5 * t.current, 0.42 + 0.58 * t.current);
  });
  return (
    <group position={[-0.24, DESK_TOP + 0.3, -1.95]}>
      <mesh>
        <sphereGeometry args={[0.062, 12, 10]} />
        <meshBasicMaterial ref={s} color="#8a8375" toneMapped={false} />
      </mesh>
      <pointLight ref={l} color="#ffc178" distance={3.6} decay={2} intensity={0} position={[0, -0.05, 0]} />
    </group>
  );
}

function Nightstand() {
  const N = LAYOUT.nightstand;
  return (
    <group>
      <Prop url={MODELS.sideTable} position={[N.cx, 0, N.cz]} rotationY={N.rotY} scale={N.scale} />
      <Prop url={MODELS.plant1} position={[N.cx + 0.02, 0.46, N.cz - 0.16]} scale={1.7} />
      <Prop url={MODELS.books} position={[N.cx - 0.02, 0.46, N.cz + 0.14]} rotationY={1.2} scale={1.3} />
    </group>
  );
}

function Bookcase() {
  const S = LAYOUT.bookcase;
  return (
    <group>
      <Prop url={MODELS.bookcase} position={[S.cx, 0, S.cz]} rotationY={S.rotY} scale={S.scale} />
      {/* 书本与摆件 */}
      <Prop url={MODELS.books} position={[S.cx - 0.02, 1.34, S.cz - 0.2]} rotationY={1.6} scale={1.5} />
      <Prop url={MODELS.books} position={[S.cx + 0.02, 1.34, S.cz + 0.18]} rotationY={1.4} scale={1.3} />
      <Prop url={MODELS.books} position={[S.cx, 0.9, S.cz - 0.1]} rotationY={1.55} scale={1.6} />
      <Prop url={MODELS.books} position={[S.cx, 0.9, S.cz + 0.24]} rotationY={1.35} scale={1.2} />
      <Prop url={MODELS.books} position={[S.cx, 0.46, S.cz + 0.05]} rotationY={1.5} scale={1.7} />
      <Prop url={MODELS.plant2} position={[S.cx, 0.46, S.cz - 0.22]} scale={1.8} />
      {/* 柜顶的纸箱 */}
      <Prop url={MODELS.box} position={[S.cx, 1.58, S.cz + 0.05]} rotationY={0.3} scale={1.4} />
    </group>
  );
}

/** 衣帽架上挂的外套 + 地上的背包 */
function Clothes() {
  const K = LAYOUT.coatRack;
  return (
    <group>
      <Prop url={MODELS.coatRack} position={[K.cx, 0, K.cz]} rotationY={K.rotY} scale={K.scale} />
      {/* 椅子上的背包 */}
      <group position={[LAYOUT.chair.cx + 0.02, 0.46, LAYOUT.chair.cz - 0.06]} rotation-y={0.5}>
        <RoundedBox args={[0.28, 0.36, 0.18]} radius={0.075} smoothness={4} position={[0, 0.18, 0]} castShadow>
          <meshToonMaterial {...toonProps(C.backpack)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        <RoundedBox args={[0.2, 0.16, 0.06]} radius={0.045} smoothness={3} position={[0, 0.1, -0.13]} castShadow>
          <meshToonMaterial {...toonProps('#3f6a78')} />
        </RoundedBox>
      </group>
    </group>
  );
}

function Props() {
  const R = LAYOUT.rug;
  const M = LAYOUT.bathMat;
  const E = LAYOUT.exitMat;
  const P = LAYOUT.plant;
  const G = LAYOUT.trash;
  return (
    <group>
      <Prop url={MODELS.rugRect} position={[R.cx, 0.004, R.cz]} rotationY={R.rotY} scale={R.scale} tint={C.rug} receiveShadow castShadow={false} />
      <Prop url={MODELS.rugMat} position={[M.cx, 0.004, M.cz]} rotationY={M.rotY} scale={M.scale} receiveShadow castShadow={false} />
      <Prop url={MODELS.rugMat} position={[E.cx, 0.004, E.cz]} rotationY={E.rotY} scale={E.scale} receiveShadow castShadow={false} />
      <Prop url={MODELS.plantBig} position={[P.cx, 0, P.cz]} rotationY={P.rotY} scale={P.scale} />
      <Prop url={MODELS.trash} position={[G.cx, 0, G.cz]} rotationY={G.rotY} scale={G.scale} />
      {/* 窗边的小凳子 */}
      <Prop url={MODELS.stool} position={[0.36, 0, -1.9]} rotationY={0.5} scale={1.5} recolor={{ carpet: C.sage }} />
    </group>
  );
}

export function Furniture({ mode }: { mode: 'day' | 'night' }) {
  const night = mode === 'night';
  return (
    <group>
      <Bed />
      <Desk night={night} />
      <DeskLampLight night={night} />
      <Nightstand />
      <Bookcase />
      <Clothes />
      <Props />
    </group>
  );
}
