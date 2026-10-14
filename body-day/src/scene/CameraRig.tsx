import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { camera, player } from '../game/state';

/**
 * 第三人称斜俯视相机：
 * - 默认固定在玩家斜上方的 3/4 视角，能同时看清角色、床、书桌、电脑与两扇门
 * - 鼠标拖拽可环绕、滚轮可拉近拉远
 * - 位置与注视点都做指数平滑，跟随不生硬
 */
export function CameraRig() {
  const { gl, camera: cam } = useThree();
  const look = useRef(new THREE.Vector3(player.x, 0.98, player.z));
  const desired = useRef(new THREE.Vector3());

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lx = 0;
    let ly = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      camera.yaw -= (e.clientX - lx) * 0.0062;
      camera.pitch = THREE.MathUtils.clamp(
        camera.pitch + (e.clientY - ly) * 0.0042,
        camera.minPitch,
        camera.maxPitch,
      );
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.dist = THREE.MathUtils.clamp(camera.dist + e.deltaY * 0.004, camera.minDist, camera.maxDist);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    // 注视点：玩家位置 + 一点点前倾，越走越平滑
    look.current.lerp(
      desired.current.set(player.x, 0.98, player.z),
      1 - Math.exp(-5.5 * dt),
    );
    const cp = Math.cos(camera.pitch);
    desired.current.set(
      look.current.x + Math.sin(camera.yaw) * cp * camera.dist,
      Math.max(0.7, look.current.y + Math.sin(camera.pitch) * camera.dist),
      look.current.z + Math.cos(camera.yaw) * cp * camera.dist,
    );
    cam.position.lerp(desired.current, 1 - Math.exp(-7.5 * dt));
    cam.lookAt(look.current.x, look.current.y + 0.1, look.current.z);
  });

  return null;
}
