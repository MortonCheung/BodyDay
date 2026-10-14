import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { toonGradient } from '../theme';

/** 把 glTF 自带的 Standard 材质换成 Toon 材质，保留原本的贴图色。 */
const matCache = new Map<string, THREE.Material>();

function toToon(src: THREE.Material, color?: string): THREE.Material {
  const key = `${src.uuid}|${color ?? ''}`;
  const hit = matCache.get(key);
  if (hit) return hit;

  const std = src as THREE.MeshStandardMaterial;
  const toon = new THREE.MeshToonMaterial({
    map: std.map ?? null,
    color: new THREE.Color(color ?? std.color?.getHex() ?? 0xffffff),
    gradientMap: toonGradient(),
    side: THREE.FrontSide,
  } as THREE.MeshToonMaterialParameters);
  matCache.set(key, toon);
  return toon;
}

export type PropProps = {
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number | [number, number, number];
  /** 统一染色（不传则保留原模型贴图色） */
  tint?: string;
  /** 按键材质名重着色，例如 { carpet: '#8fa87e' } 只把软垫类改成项目色板颜色 */
  recolor?: Record<string, string>;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/**
 * 通用道具：加载 Kenney CC0 模型 → 换 Toon 材质 → 自动把模型底面/中心对齐到原点。
 * 这样摆放时 position 就是"脚踩地面、中心在原点"的世界坐标。
 */
export function Prop({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  tint,
  recolor,
  castShadow = true,
  receiveShadow = true,
}: PropProps) {
  const { scene } = useGLTF(url);

  const { root, offset } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
      const color = (src.name && recolor?.[src.name]) || tint;
      mesh.material = toToon(src, color);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
    });
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    return {
      root: cloned,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, tint, recolor]);

  return (
    <group position={position} rotation-y={rotationY}>
      <group position={offset} scale={scale}>
        <primitive object={root} castShadow={castShadow} receiveShadow={receiveShadow} />
      </group>
    </group>
  );
}
