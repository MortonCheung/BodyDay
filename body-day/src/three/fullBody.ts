import * as THREE from 'three';

/**
 * 整具人体拆解舞台的纯计算内核。
 *
 * 这里只做与渲染无关的事：把 glTF 场景图读成「结构组」、按真实几何算拆解位移、
 * 以及给出整具人体模型的地址。所有函数都是**确定性**的——同样的输入必然得到同样的输出；
 * 位移量永远由 progress 重新计算而非累加，这是「反复拆解 0→1→0→1 不产生累计偏移」的前提。
 */

/** 官方 release 1.4.0 的静态资源根：catalog 与 models 同源（实测均返回 HTTP 200）。 */
export const FULL_BODY_ASSET_BASE = 'https://atlas.vanatome.vixotic.in';

/** curated-full-body（整具人体）在资源根下的相对路径。 */
const FULL_BODY_MODEL_PATH = '/models/z-anatomy-1.4.0-full-body.glb';

/**
 * 整具人体 GLB 的真实地址。
 *
 * 允许用 `VITE_BODYDAY_ATLAS_URL` 覆盖资源根（部署环境无法访问外网时的自建镜像）；
 * 覆盖值按**基址**使用，尾部斜杠会被去掉，其余路径按上面的常量拼接。
 */
export function resolveFullBodyModelUrl(): string {
  const raw = import.meta.env?.VITE_BODYDAY_ATLAS_URL as string | undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  const base = trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : FULL_BODY_ASSET_BASE;
  return `${base}${FULL_BODY_MODEL_PATH}`;
}

/** 运行时从 CDN 加载，不把 30 MB 的 GLB 下载进仓库。 */
export const FULL_BODY_MODEL_URL = resolveFullBodyModelUrl();

/* ---------------- 拆解位移的定标常量 ---------------- */

/** 位移距离 = 该组包围球半径 × 强度 × 缓动进度。 */
export const EXPLOSION_SPREAD = 1.15;
/** 位移方向里保留的向上分量：避免只做水平扇形散开，保持整体轮廓的可读性。 */
export const EXPLOSION_UP_BIAS = 0.32;
/** 包围球半径下限，避免极小组件的位移距离退化为 0。 */
export const EXPLOSION_MIN_RADIUS = 0.06;

/** 拆解进度钳制到 [0, 1]；非法输入（NaN / Infinity）按 0 处理，不抛错。 */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * 人体纵轴的中轴点（只取水平分量）。
 * 径向位移方向 = 从这条中轴指向结构组中心，因此不使用随机向量。
 */
export function computeBodyAxis(box: THREE.Box3): [number, number, number] {
  const center = box.getCenter(new THREE.Vector3());
  return [center.x, 0, center.z];
}

/**
 * 结构父子关系表：`anatomyId → anatomyParentId`。
 *
 * 依据 glTF 的 `extras`（three 的 GLTFLoader 会写进 `Object3D.userData`）。
 * 真实 GLB 的 `scenes[0].nodes` 是平铺的，所以解剖层级只能从这个表读，不能靠场景图父子链。
 */
export function buildParentMap(root: THREE.Object3D): Map<string, string> {
  const map = new Map<string, string>();
  root.traverse((object) => {
    const id = object.userData?.anatomyId;
    const parentId = object.userData?.anatomyParentId;
    if (typeof id === 'string' && id.length > 0 && typeof parentId === 'string' && parentId.length > 0) {
      map.set(id, parentId);
    }
  });
  return map;
}

/**
 * 取某个分组结构的**后代**集合（不含该分组节点自身）。
 *
 * `heart` / `cerebrum` / `cerebellum` 这类节点本身没有几何，几何挂在后代上；
 * 向上回溯沿 `anatomyParentId` 链进行，直到命中 groupId。回溯深度有上限，避免脏数据成环。
 */
export function resolveGroupMembers(
  root: THREE.Object3D,
  groupId: string,
  parentMap?: Map<string, string>,
): THREE.Object3D[] {
  const parents = parentMap ?? buildParentMap(root);
  const members: THREE.Object3D[] = [];
  root.traverse((object) => {
    const id = object.userData?.anatomyId;
    if (typeof id !== 'string' || id.length === 0) return;
    let cursor = parents.get(id);
    let guard = 0;
    while (cursor && guard < 64) {
      if (cursor === groupId) {
        members.push(object);
        return;
      }
      cursor = parents.get(cursor);
      guard += 1;
    }
  });
  return members;
}

/** 一个可位移的结构组：真实几何中心 + 自身尺寸（用于定标位移距离）。 */
export interface ExplosionGroup {
  id: string;
  /** 该组网格在模型坐标系下的包围盒中心 */
  center: [number, number, number];
  /** 该组网格包围盒半径（半对角线），作为位移距离的尺度 */
  radius: number;
}

/** 某个结构组在给定进度下的位移向量（模型坐标系）。 */
export interface ExplosionOffset {
  id: string;
  offset: [number, number, number];
}

/**
 * 按进度计算每个结构组的位移向量。
 *
 * 纯函数：位移只由 `progress` 与组的真实几何决定，不读取也不写入任何累计状态。
 * 因此 progress = 0 时位移恒为 0，且同一 progress 反复调用结果完全相同。
 */
export function computeExplosionOffsets(
  groups: readonly ExplosionGroup[],
  axis: [number, number, number],
  progress: number,
): ExplosionOffset[] {
  const t = clampProgress(progress);
  // smoothstep：两端变化率趋近 0，组装态与拆解态都更安静
  const eased = t * t * (3 - 2 * t);
  return groups.map((group) => {
    const radial = new THREE.Vector3(group.center[0] - axis[0], 0, group.center[2] - axis[2]);
    if (radial.lengthSq() < 1e-10) radial.set(0, 0, 1); // 恰好落在中轴上的组，给一个确定的兜底方向
    radial.normalize();
    const direction = radial.add(new THREE.Vector3(0, EXPLOSION_UP_BIAS, 0)).normalize();
    const scale = Math.max(group.radius, EXPLOSION_MIN_RADIUS);
    const distance = eased * scale * EXPLOSION_SPREAD;
    // 组装态的位移就是精确的零向量（避免出现 -0 这种无意义的符号）
    if (distance === 0) return { id: group.id, offset: [0, 0, 0] };
    const offset: [number, number, number] = [
      direction.x * distance,
      direction.y * distance,
      direction.z * distance,
    ];
    return { id: group.id, offset };
  });
}
