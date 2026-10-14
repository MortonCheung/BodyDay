import { useMemo } from 'react';
import { NEURON_COLOR, NEURON_FIT, neuronGeometry } from './cellGeometry';

/**
 * 程序化神经元模型组件。
 *
 * 几何由 `cellGeometry.ts` 构建（可单元测试），本组件只负责渲染与交互。
 * 四个可选中部件与领域实体 ID 一一对应：
 *  neuron-soma / neuron-dendrite / neuron-axon / neuron-myelin
 */

export interface CellPartProps {
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** 有选中时，未选中部件降低存在感，帮助聚焦当前结构 */
  dimOthers?: boolean;
}

export function partColor(base: string, active: boolean, hovered: boolean, dimmed: boolean): string {
  if (active || hovered) return base;
  if (dimmed) return '#c9c3b8';
  return base;
}

export function partProps(active: boolean, hovered: boolean) {
  return {
    emissive: active ? '#1a1917' : hovered ? '#4a4641' : '#000000',
    emissiveIntensity: active ? 0.3 : hovered ? 0.14 : 0,
  };
}

export function NeuronModel({ selectedId, hoveredId, onSelect, onHover, dimOthers = true }: CellPartProps) {
  const geo = useMemo(() => neuronGeometry(), []);
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
    <group scale={NEURON_FIT.scale} position={NEURON_FIT.offset}>
      {/* 胞体（含细胞核） */}
      <group {...common('neuron-soma')}>
        <mesh geometry={geo.soma}>
          <meshStandardMaterial
            color={partColor(NEURON_COLOR.soma, isActive('neuron-soma'), isHovered('neuron-soma'), dimmed)}
            roughness={0.6}
            metalness={0.05}
            {...partProps(isActive('neuron-soma'), isHovered('neuron-soma'))}
          />
        </mesh>
        <mesh geometry={geo.nucleus} position={[0.02, 0.04, 0.02]}>
          <meshStandardMaterial color={NEURON_COLOR.nucleus} roughness={0.72} metalness={0.02} />
        </mesh>
      </group>

      {/* 树突 */}
      <group {...common('neuron-dendrite')}>
        {geo.dendrites.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial
              color={partColor(NEURON_COLOR.dendrite, isActive('neuron-dendrite'), isHovered('neuron-dendrite'), dimmed)}
              roughness={0.62}
              metalness={0.04}
              {...partProps(isActive('neuron-dendrite'), isHovered('neuron-dendrite'))}
            />
          </mesh>
        ))}
      </group>

      {/* 轴突 */}
      <group {...common('neuron-axon')}>
        {geo.axon.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial
              color={partColor(NEURON_COLOR.axon, isActive('neuron-axon'), isHovered('neuron-axon'), dimmed)}
              roughness={0.6}
              metalness={0.04}
              {...partProps(isActive('neuron-axon'), isHovered('neuron-axon'))}
            />
          </mesh>
        ))}
      </group>

      {/* 髓鞘 */}
      <group {...common('neuron-myelin')}>
        {geo.myelin.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial
              color={partColor(NEURON_COLOR.myelin, isActive('neuron-myelin'), isHovered('neuron-myelin'), dimmed)}
              roughness={0.7}
              metalness={0.02}
              {...partProps(isActive('neuron-myelin'), isHovered('neuron-myelin'))}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
