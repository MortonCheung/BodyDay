import { useMemo } from 'react';
import * as THREE from 'three';
import { LEUKOCYTE_COLOR, LEUKOCYTE_FIT, leukocyteGeometry } from './cellGeometry';
import { partColor, partProps, type CellPartProps } from './NeuronModel';

/**
 * 程序化白细胞模型组件。
 *
 * 三个可选中部件：
 *  leukocyte-membrane（半透明外层）/ leukocyte-cytoplasm / leukocyte-nucleus（分叶核）
 *
 * 说明：真实血液中的「白细胞」是若干细胞类型的统称，此处以带分叶核的
 * 粒系细胞为概括性代表形态，界面中会显式标注这一点。
 */
export function LeukocyteModel({ selectedId, hoveredId, onSelect, onHover, dimOthers = true }: CellPartProps) {
  const geo = useMemo(() => leukocyteGeometry(), []);
  const dimmed = Boolean(selectedId) && dimOthers;

  const common = (id: string) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onHover?.(id);
    },
    onPointerOut: () => onHover?.(null),
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect?.(id);
    },
  });

  const isActive = (id: string) => selectedId === id;
  const isHovered = (id: string) => hoveredId === id;

  return (
    <group scale={LEUKOCYTE_FIT.scale} position={LEUKOCYTE_FIT.offset}>
      {/* 细胞质与胞质颗粒 */}
      <group {...common('leukocyte-cytoplasm')}>
        <mesh geometry={geo.cytoplasm}>
          <meshStandardMaterial
            color={partColor(LEUKOCYTE_COLOR.cytoplasm, isActive('leukocyte-cytoplasm'), isHovered('leukocyte-cytoplasm'), dimmed)}
            roughness={0.68}
            metalness={0.03}
            transparent
            opacity={0.96}
            {...partProps(isActive('leukocyte-cytoplasm'), isHovered('leukocyte-cytoplasm'))}
          />
        </mesh>
        {geo.granules.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color={LEUKOCYTE_COLOR.nucleus} roughness={0.8} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>

      {/* 分叶细胞核 */}
      <group {...common('leukocyte-nucleus')}>
        {geo.nucleusLobes.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial
              color={partColor(LEUKOCYTE_COLOR.nucleus, isActive('leukocyte-nucleus'), isHovered('leukocyte-nucleus'), dimmed)}
              roughness={0.66}
              metalness={0.04}
              {...partProps(isActive('leukocyte-nucleus'), isHovered('leukocyte-nucleus'))}
            />
          </mesh>
        ))}
      </group>

      {/* 半透明细胞膜 */}
      <group {...common('leukocyte-membrane')}>
        <mesh geometry={geo.membrane}>
          <meshStandardMaterial
            color={partColor(LEUKOCYTE_COLOR.membrane, isActive('leukocyte-membrane'), isHovered('leukocyte-membrane'), dimmed)}
            roughness={0.5}
            metalness={0.05}
            transparent
            opacity={isActive('leukocyte-membrane') ? 0.72 : 0.34}
            side={THREE.DoubleSide}
            {...partProps(isActive('leukocyte-membrane'), isHovered('leukocyte-membrane'))}
          />
        </mesh>
      </group>
    </group>
  );
}
