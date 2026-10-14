import { useEffect, useState } from 'react';
import { SCALE_MAP, type Scale } from '../../domain';

/**
 * 右纸条上的两个小部件：秒级时钟与尺度轴指示。
 *
 * 尺度轴取代了此前的全屏遮罩：它不遮挡画面，只安静地标出
 * 「当前在人体 → 系统 → 器官 → 细胞里的哪一层」，跨尺度时仍由镜头运动说明变化。
 */

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <span className="bd-clock" role="timer">
      {date}
      {' '}
      {time}
      <span className="bd-clock__zone">{zone}</span>
    </span>
  );
}

/** 尺度轴只列出本作品真正提供模型与内容的四层 */
const SCALE_ORDER: Scale[] = ['body', 'system', 'organ', 'cell'];

export function ScaleLine({
  scale,
  onNavigate,
}: {
  scale: Scale;
  onNavigate: (scale: Scale) => void;
}) {
  const activeIndex = SCALE_ORDER.indexOf(scale);
  return (
    <div className="bd-scaleline" role="group" aria-label="尺度轴">
      {SCALE_ORDER.map((item, index) => (
        <div key={item} style={{ display: 'contents' }}>
          {index > 0 ? <span className="bd-scaleline__link" aria-hidden="true" /> : null}
          <button
            type="button"
            className="bd-scaleline__node"
            data-active={item === scale}
            data-past={activeIndex > -1 && index < activeIndex}
            aria-current={item === scale ? 'true' : undefined}
            onClick={() => onNavigate(item)}
          >
            <span className="bd-scaleline__tick" aria-hidden="true" />
            <span className="bd-scaleline__label">{SCALE_MAP[item]?.labelZh ?? item}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
