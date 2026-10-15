/**
 * 解剖模型资产地址（**不依赖 three.js** 的纯常量模块）。
 *
 * 单独放一个文件的原因：`three/fullBody.ts` 需要 `THREE` 的包围盒与向量，
 * 而「关于」页只需要地址字符串。若让它从 three 模块里导出，
 * 首页就会把整个三维运行时拉进主包，与「按需加载三维」的分包策略冲突。
 *
 * V2 起模型**随作品一起发布**（`public/models/`），不再依赖运行时外链：
 * 离线评审、断网演示、CDN 限速都不会让作品开不了。许可与署名见
 * `public/models/ANATOMY_LICENSE.txt`（CC BY-SA 4.0）。
 */

/** 随包发布的整具人体资源（相对站点根目录）。 */
export const ANATOMY_MODEL_LOCAL_PATH = '/models/z-anatomy-1.4.0-full-body.glb';

/** 上游 release 的资源根，仅用于在文档中标注来源。 */
export const ANATOMY_UPSTREAM_BASE = 'https://atlas.vanatome.vixotic.in';

/** 打印给用户看的版本口径（与 catalog 中的 profile 名一致）。 */
export const ANATOMY_MODEL_VERSION = 'Vanatome Human Atlas 1.4.0 · curated-full-body';

/**
 * 解析资源根。
 *
 * 默认返回空串，即使用随包发布的本地文件；只有显式配置
 * `VITE_BODYDAY_ATLAS_URL` 时才改为从该基址加载（同版本镜像或上游 CDN）。
 */
export function resolveAnatomyAssetBase(): string {
  const raw = import.meta.env?.VITE_BODYDAY_ATLAS_URL as string | undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, '') : '';
}

/** 整具人体 GLB 的真实地址。 */
export function resolveFullBodyModelUrl(): string {
  return `${resolveAnatomyAssetBase()}${ANATOMY_MODEL_LOCAL_PATH}`;
}

export const FULL_BODY_MODEL_URL = resolveFullBodyModelUrl();

/** 本地资源是否随包发布（「关于」页据此给出不同措辞） */
export function isModelBundledLocally(): boolean {
  return resolveAnatomyAssetBase() === '';
}
