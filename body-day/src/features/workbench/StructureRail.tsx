import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes';
import type { BodyEntity, SystemBrief } from '../../domain';

/**
 * 左栏：结构与图层操作。
 *
 * 它承担两件事：
 * 1. 在真实解剖系统之间切换（对应 `/systems/:systemId`，只是同一舞台换图层）；
 * 2. 列出当前图层里**真实存在**的结构，点击即聚焦，右栏随之更新。
 *
 * 所有条目都来自已加载的 atlas 元数据或已登记的领域实体，不产生任何猜测节点。
 */

export interface RailStructure {
  id: string;
  name: string;
  kind?: string;
  system: string;
  layer: string;
  /** 能映射到 BodyDay 实体时给出实体 ID */
  entityId?: string | null;
}

interface StructureRailProps {
  systems: SystemBrief[];
  /** 当前激活的系统（器官页为其所属系统） */
  activeSystemId: string | null;
  /** 当前图层内可聚焦的真实结构（已排序、已过滤） */
  structures: RailStructure[];
  selectedStructureId: string | null;
  onFocusStructure: (id: string) => void;
  /** 细胞页的部件清单（其余页面为 null） */
  cellParts: BodyEntity[] | null;
  selectedPartId: string | null;
  onFocusPart: (id: string) => void;
  /** 当前图层尚在加载时给出的说明 */
  loadingStructures: boolean;
}

export function StructureRail({
  systems,
  activeSystemId,
  structures,
  selectedStructureId,
  onFocusStructure,
  cellParts,
  selectedPartId,
  onFocusPart,
  loadingStructures,
}: StructureRailProps) {
  return (
    <aside className="bd-wb-rail" aria-label="结构与图层" data-paper-surface>
      <div className="bd-wb-section">
        <span className="bd-label">解剖系统</span>
        <nav className="bd-list" aria-label="解剖系统列表">
          <Link className="bd-list__item" data-active={!activeSystemId} to={ROUTES.body}>
            <span className="bd-list__mark" aria-hidden="true" />
            <span className="bd-list__name">人体总览</span>
            <span className="bd-list__hint">全身</span>
          </Link>
          {systems.map((system) => (
            <Link
              key={system.id}
              className="bd-list__item"
              data-active={activeSystemId === system.id}
              to={ROUTES.system(system.id)}
            >
              <span className="bd-list__mark" aria-hidden="true" />
              <span className="bd-list__name">{system.nameZh}</span>
              <span className="bd-list__hint">{system.open ? '专题' : '浏览'}</span>
            </Link>
          ))}
        </nav>
        <p className="bd-wb-note">
          标注「专题」的系统附有完整科普正文与向下深潜入口；其余系统可浏览其真实结构。
        </p>
      </div>

      {cellParts ? (
        <div className="bd-wb-section">
          <span className="bd-label">细胞结构</span>
          <nav className="bd-list" aria-label="细胞结构列表">
            {cellParts.map((part) => (
              <button
                key={part.id}
                type="button"
                className="bd-list__item"
                data-active={selectedPartId === part.id}
                onClick={() => onFocusPart(part.id)}
              >
                <span className="bd-list__mark" aria-hidden="true" />
                <span className="bd-list__name">{part.nameZh}</span>
                <span className="bd-list__hint">{part.nameEn}</span>
              </button>
            ))}
          </nav>
        </div>
      ) : (
        <div className="bd-wb-section">
          <div className="bd-wb-section__head">
            <span className="bd-label">可聚焦结构</span>
            {structures.length > 0 ? (
              <span className="bd-caption">{structures.length} 项</span>
            ) : null}
          </div>
          {loadingStructures ? (
            <p className="bd-wb-note">该图层的结构正在加载，完成后会在此列出。</p>
          ) : structures.length === 0 ? (
            <p className="bd-wb-note">
              本页不逐一列出结构：请从模型上直接点选，或先在上方选择一个解剖系统。
            </p>
          ) : (
            <>
              <nav className="bd-list" aria-label="结构列表">
                {structures.map((structure) => (
                  <button
                    key={structure.id}
                    type="button"
                    className="bd-list__item"
                    data-active={selectedStructureId === structure.id}
                    onClick={() => onFocusStructure(structure.id)}
                  >
                    <span className="bd-list__mark" aria-hidden="true" />
                    <span className="bd-list__name">{structure.name}</span>
                    <span className="bd-list__hint">{structure.kind === 'organ' ? '器官' : ''}</span>
                  </button>
                ))}
              </nav>
              <p className="bd-wb-note">
                一个器官下的细分结构会折叠为该器官一项；更细的结构可直接在模型上点选。
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
