import { Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * 三维舞台降级边界。
 *
 * 覆盖三类真实故障：
 *  - 浏览器不支持 WebGL；
 *  - WebGL 上下文丢失（低端设备、上下文数量超限）；
 *  - 模型加载或解码过程中的未捕获异常。
 *
 * 任何一类发生时：舞台内显示明确说明 + 重试入口，
 * 页面其余部分（结构列表、知识卡、来源、导航）保持可用，不白屏。
 */

/**
 * WebGL 能力探测：每个会话只探测一次，并主动释放探测用的上下文。
 * 反复创建探测上下文会占用浏览器有限的 WebGL 上下文配额，
 * 反而让真正的舞台更容易丢失上下文。
 */
let cachedWebglSupport: boolean | null = null;

export function webglAvailable(): boolean {
  if (cachedWebglSupport !== null) return cachedWebglSupport;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    cachedWebglSupport = Boolean(gl);
    if (gl) {
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
    return cachedWebglSupport;
  } catch {
    cachedWebglSupport = false;
    return false;
  }
}

export function StageBoundary({
  children,
  label,
  onRetryAll,
}: {
  children: ReactNode;
  label: string;
  /** 额外提示：例如「可继续使用右侧结构列表」 */
  onRetryAll?: () => void;
}) {
  const supported = useMemo(() => webglAvailable(), []);
  const [nonce, setNonce] = useState(0);

  const reset = useCallback(() => {
    setNonce((n) => n + 1);
    onRetryAll?.();
  }, [onRetryAll]);

  if (!supported) {
    return (
      <div className="bd-stage__canvas">
        <div className="bd-state" role="alert">
          <p className="bd-state__title">当前浏览器不支持 WebGL</p>
          <p className="bd-state__detail">
            三维舞台无法显示，但本页的文字知识、结构清单与来源仍可正常阅读。
            建议更换为最新版 Chrome / Edge / Safari 并开启硬件加速后重试。
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      key={nonce}
      fallback={(error) => (
        <div className="bd-stage__canvas">
          <div className="bd-state" role="alert">
            <p className="bd-state__title">{label}暂时不可用</p>
            <p className="bd-state__detail">
              三维场景未能初始化或已丢失（常见于显存不足、同时开启过多 3D 标签页，或设备缺少硬件加速）。
              页面其余内容不受影响，可继续阅读知识卡与来源。
            </p>
            <button type="button" className="bd-button" onClick={reset}>
              重新初始化三维舞台
            </button>
            <p className="bd-caption">{error.message}</p>
          </div>
        </div>
      )}
    >
      <Suspense
        fallback={
          <div className="bd-state">
            <p className="bd-state__title">正在按需加载三维引擎</p>
            <div className="bd-progress">
              <div className="bd-progress__bar" data-indeterminate="true" style={{ width: '40%' }} />
            </div>
            <p className="bd-state__detail">
              三维运行时（Three.js / React Three Fiber）只在进入三维页面时才加载，首屏不下载它。
            </p>
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
