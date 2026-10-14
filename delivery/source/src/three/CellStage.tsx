import { ModelStage, type StageHotspot } from './ModelStage';
import { NeuronModel } from './NeuronModel';
import { LeukocyteModel } from './LeukocyteModel';
import { NEURON_HOTSPOTS, LEUKOCYTE_HOTSPOTS, CELL_VIEW_RADIUS } from './cellGeometry';
import type { StageState } from './useStageState';
import { ENTITY_MAP } from '../domain';

/**
 * 细胞层舞台：程序化几何 + DOM 热点标注。
 * 细胞模型为本工程原创几何，科学示意，不按真实比例。
 */

export type CellId = 'neuron' | 'leukocyte';

const NEURON_PARTS: { modelId: string; entityId: string }[] = [
  { modelId: 'neuron-soma', entityId: 'neuron-soma' },
  { modelId: 'neuron-dendrite', entityId: 'neuron-dendrite' },
  { modelId: 'neuron-axon', entityId: 'neuron-axon' },
  { modelId: 'neuron-myelin', entityId: 'neuron-myelin' },
];

const LEUKOCYTE_PARTS: { modelId: string; entityId: string }[] = [
  { modelId: 'leukocyte-membrane', entityId: 'leukocyte-membrane' },
  { modelId: 'leukocyte-cytoplasm', entityId: 'leukocyte-cytoplasm' },
  { modelId: 'leukocyte-nucleus', entityId: 'leukocyte-nucleus' },
];

function buildHotspots(
  parts: { modelId: string; entityId: string }[],
  anchors: Record<string, [number, number, number]>,
): StageHotspot[] {
  return parts.map((p) => ({
    modelId: p.modelId,
    entityId: p.entityId,
    label: ENTITY_MAP[p.entityId]?.nameZh ?? p.modelId,
    position: anchors[p.modelId] ?? [0, 0, 0],
  }));
}

export interface CellStageProps {
  cellId: CellId;
  state: StageState;
  ariaLabel?: string;
}

export function CellStage({ cellId, state, ariaLabel }: CellStageProps) {
  const hotspots =
    cellId === 'neuron'
      ? buildHotspots(NEURON_PARTS, NEURON_HOTSPOTS)
      : buildHotspots(LEUKOCYTE_PARTS, LEUKOCYTE_HOTSPOTS);

  return (
    <ModelStage
      canvasKey={cellId}
      hotspots={hotspots}
      selectedId={state.selectedEntityId}
      onSelectHotspot={(entityId) => state.selectEntity(entityId || null)}
      onHoverHotspot={state.hoverEntity}
      focusRequest={
        state.focusTargetId
          ? { entityId: state.focusTargetId, nonce: state.focusNonce }
          : null
      }
      resetNonce={state.resetNonce}
      onUserRotate={state.markUserRotate}
      defaultDistance={CELL_VIEW_RADIUS * 2.6}
      ariaLabel={ariaLabel}
    >
      {cellId === 'neuron' ? (
        <NeuronModel
          selectedId={state.selectedEntityId}
          hoveredId={state.hoveredEntityId}
          onSelect={state.selectEntity}
          onHover={state.hoverEntity}
        />
      ) : (
        <LeukocyteModel
          selectedId={state.selectedEntityId}
          hoveredId={state.hoveredEntityId}
          onSelect={state.selectEntity}
          onHover={state.hoverEntity}
        />
      )}
    </ModelStage>
  );
}
