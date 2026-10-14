import { Outlines, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { C, sharedFloorTexture, sharedPosterTexture, toonProps } from '../theme';
import { OUTER, LAYOUT } from '../game/layout';
import { ROOM } from '../game/state';

const T = ROOM.wallThickness;
const H = ROOM.height;

/** 描边厚度的统一值：整体克制，只勾关键轮廓 */
const OT = 0.009;

type BoxProps = {
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
  rotY?: number;
  outline?: boolean;
  castShadow?: boolean;
};

/** 房间结构通用方块 */
function B({ size, pos, color, rotY = 0, outline = true, castShadow = true }: BoxProps) {
  return (
    <mesh position={pos} rotation-y={rotY} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshToonMaterial {...toonProps(color)} />
      {outline && <Outlines thickness={OT} color={C.outline} />}
    </mesh>
  );
}

/**
 * 可剔除墙体组：相机绕到墙外侧时自动隐藏，
 * 形成"娃娃屋俯瞰"效果，同时保证永远能看到屋内。
 */
function Cullable({
  children,
  normal,
  point,
}: {
  children: ReactNode;
  /** 指向房间内部的法线（XZ） */
  normal: [number, number];
  /** 墙面上的一个点 */
  point: [number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    const d =
      (camera.position.x - point[0]) * normal[0] + (camera.position.z - point[1]) * normal[1];
    const shouldHide = d < 0.02;
    if (g.visible === shouldHide) g.visible = !shouldHide;
  });
  return <group ref={ref}>{children}</group>;
}

function Floor() {
  const tex = sharedFloorTexture();
  return (
    <group>
      {/* 底板：让娃娃屋有一个完整的"地台" */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[OUTER.x * 2, 0.2, OUTER.z * 2]} />
        <meshToonMaterial {...toonProps(C.wallEdge)} />
        <Outlines thickness={OT} color={C.outline} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM.maxX * 2, ROOM.maxZ * 2]} />
        <meshToonMaterial map={tex} {...toonProps('#ffffff')} />
      </mesh>
    </group>
  );
}

function Walls() {
  const { doorExit, doorBath, window: W } = LAYOUT;
  const zBack = ROOM.minZ - T / 2;
  const zFront = ROOM.maxZ + T / 2;
  const xLeft = ROOM.minX - T / 2;
  const xRight = ROOM.maxX + T / 2;

  return (
    <>
      {/* 后墙（含窗洞与出口门洞） */}
      <Cullable normal={[0, 1]} point={[0, ROOM.minZ]}>
        <B size={[0.2 - OUTER.innerX, H, T]} pos={[(0.2 + OUTER.innerX) / 2, H / 2, zBack]} color={C.wallUpper} />
        <B size={[0.2, H, T]} pos={[1.4, H / 2, zBack]} color={C.wallUpper} />
        <B size={[OUTER.x - 2.4, H, T]} pos={[(2.4 + OUTER.x) / 2, H / 2, zBack]} color={C.wallUpper} />
        <B size={[W.w, W.y0, T]} pos={[W.cx, W.y0 / 2, zBack]} color={C.wallUpper} />
        <B size={[W.w, H - W.y1, T]} pos={[W.cx, (H + W.y1) / 2, zBack]} color={C.wallUpper} />
        <B size={[doorExit.w, H - doorExit.h, T]} pos={[doorExit.cx, (H + doorExit.h) / 2, zBack]} color={C.wallUpper} />
        {/* 踢脚线 + 腰线 */}
        <B size={[doorExit.x0 - OUTER.innerX, 0.11, 0.045]} pos={[(doorExit.x0 + OUTER.innerX) / 2, 0.055, ROOM.minZ + 0.022]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[OUTER.x - doorExit.x1, 0.11, 0.045]} pos={[(doorExit.x1 + OUTER.x) / 2, 0.055, ROOM.minZ + 0.022]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[OUTER.x - OUTER.innerX, 0.05, 0.035]} pos={[0, 1.0, ROOM.minZ + 0.018]} color={C.wallEdge} outline={false} castShadow={false} />
        {/* 墙顶压边 */}
        <B size={[OUTER.x - OUTER.innerX, 0.06, T + 0.04]} pos={[0, H - 0.03, zBack]} color={C.ceilingTrim} outline={false} />
      </Cullable>

      {/* 左墙（含卫生间门洞） */}
      <Cullable normal={[1, 0]} point={[ROOM.minX, 0]}>
        <B size={[T, H, doorBath.z0 - OUTER.innerZ]} pos={[xLeft, H / 2, (doorBath.z0 + OUTER.innerZ) / 2]} color={C.wallUpper} />
        <B size={[T, H, OUTER.z - doorBath.z1]} pos={[xLeft, H / 2, (doorBath.z1 + OUTER.z) / 2]} color={C.wallUpper} />
        <B size={[T, H - doorBath.h, doorBath.w]} pos={[xLeft, (H + doorBath.h) / 2, doorBath.cz]} color={C.wallUpper} />
        <B size={[0.045, 0.11, doorBath.z0 - OUTER.innerZ]} pos={[ROOM.minX + 0.022, 0.055, (doorBath.z0 + OUTER.innerZ) / 2]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[0.045, 0.11, OUTER.z - doorBath.z1]} pos={[ROOM.minX + 0.022, 0.055, (doorBath.z1 + OUTER.z) / 2]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[0.035, 0.05, OUTER.z - OUTER.innerZ]} pos={[ROOM.minX + 0.018, 1.0, 0]} color={C.wallEdge} outline={false} castShadow={false} />
        <B size={[T + 0.04, 0.06, OUTER.z - OUTER.innerZ]} pos={[xLeft, H - 0.03, 0]} color={C.ceilingTrim} outline={false} />
      </Cullable>

      {/* 前墙 */}
      <Cullable normal={[0, -1]} point={[0, ROOM.maxZ]}>
        <B size={[OUTER.x * 2, H, T]} pos={[0, H / 2, zFront]} color={C.wallUpper} />
        <B size={[OUTER.x * 2, 0.11, 0.045]} pos={[0, 0.055, ROOM.maxZ - 0.022]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[OUTER.x * 2, 0.05, 0.035]} pos={[0, 1.0, ROOM.maxZ - 0.018]} color={C.wallEdge} outline={false} castShadow={false} />
        <B size={[OUTER.x * 2, 0.06, T + 0.04]} pos={[0, H - 0.03, zFront]} color={C.ceilingTrim} outline={false} />
      </Cullable>

      {/* 右墙 */}
      <Cullable normal={[-1, 0]} point={[ROOM.maxX, 0]}>
        <B size={[T, H, OUTER.z * 2]} pos={[xRight, H / 2, 0]} color={C.wallUpper} />
        <B size={[0.045, 0.11, OUTER.z * 2]} pos={[ROOM.maxX - 0.022, 0.055, 0]} color={C.baseboard} outline={false} castShadow={false} />
        <B size={[0.035, 0.05, OUTER.z * 2]} pos={[ROOM.maxX - 0.018, 1.0, 0]} color={C.wallEdge} outline={false} castShadow={false} />
        <B size={[T + 0.04, 0.06, OUTER.z * 2]} pos={[xRight, H - 0.03, 0]} color={C.ceilingTrim} outline={false} />
      </Cullable>
    </>
  );
}

function WindowUnit() {
  const W = LAYOUT.window;
  const z = ROOM.minZ + 0.035;
  return (
    <group>
      {/* 窗框 */}
      <B size={[W.w, 0.07, 0.07]} pos={[W.cx, W.y1 - 0.02, z]} color={C.windowFrame} />
      <B size={[W.w, 0.07, 0.07]} pos={[W.cx, W.y0 + 0.02, z]} color={C.windowFrame} />
      <B size={[0.07, W.h, 0.07]} pos={[W.x0 + 0.03, W.cy, z]} color={C.windowFrame} />
      <B size={[0.07, W.h, 0.07]} pos={[W.x1 - 0.03, W.cy, z]} color={C.windowFrame} />
      {/* 窗棂 */}
      <B size={[0.045, W.h - 0.1, 0.05]} pos={[W.cx, W.cy, z]} color={C.windowFrame} outline={false} />
      <B size={[W.w - 0.1, 0.045, 0.05]} pos={[W.cx, W.cy + 0.02, z]} color={C.windowFrame} outline={false} />
      {/* 窗台板 */}
      <B size={[W.w + 0.14, 0.05, 0.2]} pos={[W.cx, W.y0 - 0.03, ROOM.minZ + 0.1]} color={C.windowFrame} />
      {/* 窗帘杆 */}
      <mesh position={[W.cx, W.y1 + 0.17, ROOM.minZ + 0.09]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 2, 8]} />
        <meshToonMaterial {...toonProps(C.woodDark)} />
      </mesh>
      <mesh position={[W.cx - 0.1, W.y1 + 0.17, ROOM.minZ + 0.09]} castShadow>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshToonMaterial {...toonProps(C.woodDark)} />
      </mesh>
      <mesh position={[W.cx + 0.1, W.y1 + 0.17, ROOM.minZ + 0.09]} castShadow>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshToonMaterial {...toonProps(C.woodDark)} />
      </mesh>
      {/* 两侧窗帘 */}
      <group position={[W.x0 - 0.02, W.y0 - 0.1, ROOM.minZ + 0.1]}>
        <RoundedBox args={[0.3, 0.55, 0.11]} radius={0.045} smoothness={3} position={[0, 0.275, 0]} castShadow>
          <meshToonMaterial {...toonProps(C.curtain)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        <RoundedBox args={[0.26, 1.12, 0.1]} radius={0.04} smoothness={3} position={[0, 1.1, 0]} castShadow>
          <meshToonMaterial {...toonProps(C.curtainShade)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
      </group>
      <group position={[W.x1 + 0.02, W.y0 - 0.1, ROOM.minZ + 0.1]}>
        <RoundedBox args={[0.3, 0.55, 0.11]} radius={0.045} smoothness={3} position={[0, 0.275, 0]} castShadow>
          <meshToonMaterial {...toonProps(C.curtain)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
        <RoundedBox args={[0.26, 1.12, 0.1]} radius={0.04} smoothness={3} position={[0, 1.1, 0]} castShadow>
          <meshToonMaterial {...toonProps(C.curtainShade)} />
          <Outlines thickness={OT} color={C.outline} />
        </RoundedBox>
      </group>
      {/* 窗台上的小物 */}
      <mesh position={[W.x0 + 0.16, W.y0 - 0.01, ROOM.minZ + 0.11]} castShadow>
        <cylinderGeometry args={[0.06, 0.045, 0.1, 10]} />
        <meshToonMaterial {...toonProps(C.pot)} />
      </mesh>
      <mesh position={[W.x0 + 0.16, W.y0 + 0.09, ROOM.minZ + 0.11]} castShadow>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshToonMaterial {...toonProps(C.plant)} />
      </mesh>
      <mesh position={[W.x1 - 0.16, W.y0 + 0.04, ROOM.minZ + 0.11]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.11, 10]} />
        <meshToonMaterial {...toonProps(C.mug)} />
      </mesh>
    </group>
  );
}

function DoorExit() {
  const D = LAYOUT.doorExit;
  const zf = ROOM.minZ + 0.04;
  return (
    <group>
      <B size={[0.07, D.h + 0.08, 0.14]} pos={[D.x0 + 0.035, (D.h + 0.08) / 2, ROOM.minZ + 0.03]} color={C.doorFrame} />
      <B size={[0.07, D.h + 0.08, 0.14]} pos={[D.x1 - 0.035, (D.h + 0.08) / 2, ROOM.minZ + 0.03]} color={C.doorFrame} />
      <B size={[D.w, 0.09, 0.14]} pos={[D.cx, D.h + 0.045, ROOM.minZ + 0.03]} color={C.doorFrameLight} />
      {/* 门扇 */}
      <B size={[D.w - 0.1, D.h - 0.04, 0.05]} pos={[D.cx, (D.h - 0.04) / 2 + 0.02, ROOM.minZ - 0.03]} color={C.doorLeaf} />
      <B size={[D.w - 0.32, 0.42, 0.028]} pos={[D.cx, 1.52, zf - 0.03]} color={C.woodDark} outline={false} />
      <B size={[D.w - 0.32, 0.42, 0.028]} pos={[D.cx, 0.62, zf - 0.03]} color={C.woodDark} outline={false} />
      <mesh position={[D.x1 - 0.17, 1.02, zf - 0.02]} castShadow>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshToonMaterial {...toonProps(C.amber)} />
      </mesh>
    </group>
  );
}

function DoorBath() {
  const D = LAYOUT.doorBath;
  const xi = ROOM.minX + 0.04;
  return (
    <group>
      <B size={[0.14, D.h + 0.08, 0.07]} pos={[ROOM.minX + 0.03, (D.h + 0.08) / 2, D.z0 + 0.035]} color={C.doorFrameLight} />
      <B size={[0.14, D.h + 0.08, 0.07]} pos={[ROOM.minX + 0.03, (D.h + 0.08) / 2, D.z1 - 0.035]} color={C.doorFrameLight} />
      <B size={[0.14, 0.09, D.w]} pos={[ROOM.minX + 0.03, D.h + 0.045, D.cz]} color={C.doorFrame} />
      {/* 门扇 */}
      <B size={[0.05, D.h - 0.04, D.w - 0.1]} pos={[ROOM.minX - 0.03, (D.h - 0.04) / 2 + 0.02, D.cz]} color={C.doorLeafBath} />
      <B size={[0.028, 0.62, D.w - 0.3]} pos={[xi - 0.03, 1.5, D.cz]} color={C.cream} outline={false} />
      <B size={[0.028, 0.38, D.w - 0.3]} pos={[xi - 0.03, 0.62, D.cz]} color={C.doorLeafBath} outline={false} />
      <mesh position={[xi - 0.02, 1.02, D.cz + 0.34]} castShadow>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshToonMaterial {...toonProps(C.amber)} />
      </mesh>
    </group>
  );
}

function WallArt() {
  return (
    <group>
      {/* 书桌上方的两张小画 */}
      <group position={[-1.05, 1.95, ROOM.minZ + 0.03]}>
        <B size={[0.46, 0.6, 0.03]} pos={[0, 0, 0]} color={C.woodDark} />
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.38, 0.52]} />
          <meshToonMaterial map={sharedPosterTexture(0)} {...toonProps('#ffffff')} />
        </mesh>
      </group>
      <group position={[-0.45, 1.86, ROOM.minZ + 0.03]}>
        <B size={[0.34, 0.44, 0.03]} pos={[0, 0, 0]} color={C.woodDark} />
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.27, 0.37]} />
          <meshToonMaterial map={sharedPosterTexture(1)} {...toonProps('#ffffff')} />
        </mesh>
      </group>

      {/* 左墙上的挂钟（指向 08:30，与 HUD 一致） */}
      <group position={[ROOM.minX + 0.03, 1.98, -1.35]} rotation-y={Math.PI / 2}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.045, 20]} />
          <meshToonMaterial {...toonProps(C.woodDark)} />
        </mesh>
        <mesh position={[0, 0, 0.026]}>
          <circleGeometry args={[0.145, 24]} />
          <meshToonMaterial {...toonProps(C.clockFace)} />
        </mesh>
        {[0, 90, 180, 270].map((a) => (
          <mesh key={a} position={[Math.sin((a * Math.PI) / 180) * 0.12, Math.cos((a * Math.PI) / 180) * 0.12, 0.03]}>
            <boxGeometry args={[0.012, 0.022, 0.008]} />
            <meshToonMaterial {...toonProps(C.wallEdge)} />
          </mesh>
        ))}
        <group position={[0, 0, 0.032]} rotation-z={-(255 * Math.PI) / 180}>
          <mesh position={[0, 0.036, 0]}>
            <boxGeometry args={[0.018, 0.072, 0.01]} />
            <meshToonMaterial {...toonProps(C.outline)} />
          </mesh>
        </group>
        <group position={[0, 0, 0.034]} rotation-z={-Math.PI}>
          <mesh position={[0, 0.052, 0]}>
            <boxGeometry args={[0.012, 0.104, 0.009]} />
            <meshToonMaterial {...toonProps(C.outline)} />
          </mesh>
        </group>
        <mesh position={[0, 0, 0.036]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshToonMaterial {...toonProps(C.terracotta)} />
        </mesh>
      </group>

      {/* 左墙床头上方的装饰画 */}
      <group position={[ROOM.minX + 0.03, 1.86, -1.55]} rotation-y={Math.PI / 2}>
        <B size={[0.5, 0.66, 0.03]} pos={[0, 0, 0]} color={C.woodDark} />
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.42, 0.58]} />
          <meshToonMaterial map={sharedPosterTexture(0)} {...toonProps('#ffffff')} />
        </mesh>
      </group>
    </group>
  );
}

export function Room() {
  return (
    <group>
      <Floor />
      <Walls />
      <WindowUnit />
      <DoorExit />
      <DoorBath />
      <WallArt />
    </group>
  );
}
