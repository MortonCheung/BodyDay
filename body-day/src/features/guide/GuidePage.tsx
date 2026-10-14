import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Notice, SourceList } from '../../components/ui';
import { ROUTES } from '../../app/routes';

/**
 * 02 使用向导。
 *
 * 最低可验收交互：一个真实的「尺度练习」——必须按人体 → 器官 → 细胞的顺序点击，
 * 完成或跳过都会留下明确状态，而不是一段纯文字说明。
 */
export function GuidePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const stations = [
    { id: 'body', label: '人体', note: '整具身体，约 1.7 米', scale: 'body' },
    { id: 'organ', label: '器官', note: '厘米级，如脑、心、脾', scale: 'organ' },
    { id: 'cell', label: '细胞', note: '微米级，如神经元、白细胞', scale: 'cell' },
  ];

  const click = (index: number) => {
    if (done) return;
    if (index === step) {
      const next = step + 1;
      setStep(next);
      setHint(null);
      if (next === stations.length) setDone(true);
    } else {
      setHint(
        index < step
          ? '这一层你已经通过了。请按尺度从大到小继续。'
          : '顺序反了：BodyDay 的导航是从人体一路向更小的尺度推进。',
      );
    }
  };

  return (
    <div className="bd-container bd-container--prose bd-page">
      <div className="bd-stack bd-stack--wide">
        <PageHeader
          eyebrow="02 · 使用向导"
          title="先花一分钟，知道自己在哪一层"
          lead="BodyDay 的所有交互都围绕一件事：让你清楚自己现在处在哪一个尺度上，以及下一步会走向哪里。"
          crumbs={[{ label: '封面', to: ROUTES.cover }, { label: '使用向导' }]}
        />

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">操作方式</span>
            <h2 className="bd-section-title">三维舞台怎么用</h2>
          </div>
          <div className="bd-grid bd-grid--2">
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">指针</span>
              <p className="bd-body-secondary">
                左键拖动旋转模型；滚轮缩放；空白处单击取消选中。人体层还支持右键呼出结构菜单。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">触摸</span>
              <p className="bd-body-secondary">
                单指拖动旋转；双指缩放与平移。触摸目标不小于 44 像素，底部信息区可折叠。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">键盘</span>
              <p className="bd-body-secondary">
                结构列表与显示热点都可 Tab 聚焦；Enter / Space 选中；Esc 取消当前选中。
              </p>
            </div>
            <div className="bd-panel bd-panel--flat">
              <span className="bd-label">减弱动态</span>
              <p className="bd-body-secondary">
                系统开启「减少动态效果」时，跨尺度转场与镜头推进都会变为瞬时切换，不播放动画。
              </p>
            </div>
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">交互练习</span>
            <h2 className="bd-section-title">按尺度从大到小，依次点过三个节点</h2>
            <p className="bd-body-secondary">
              这是 BodyDay 导航的唯一规则：向下一步进入更小的结构，向上一路返回。
            </p>
          </div>

          <div className="bd-panel" id="practice">
            <div className="bd-row" style={{ gap: 'var(--bd-space-5)', alignItems: 'stretch' }}>
              {stations.map((station, index) => {
                const passed = index < step;
                const active = index === step && !done;
                return (
                  <button
                    key={station.id}
                    type="button"
                    className="bd-rel"
                    style={{
                      flex: '1 1 180px',
                      borderColor: passed
                        ? 'var(--bd-ok)'
                        : active
                          ? 'var(--bd-ink)'
                          : 'var(--bd-rule)',
                    }}
                    aria-pressed={passed}
                    onClick={() => click(index)}
                  >
                    <span className="bd-rel__type" data-type={passed ? 'functional' : 'part_of'}>
                      {passed ? '已完成' : active ? '当前' : '待完成'}
                    </span>
                    <span className="bd-title" style={{ fontFamily: 'var(--bd-font-display)', fontSize: '1.4rem' }}>
                      {station.label}
                    </span>
                    <span className="bd-caption">{station.note}</span>
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" style={{ marginTop: 'var(--bd-space-4)' }}>
              {hint ? (
                <p className="bd-body-secondary" style={{ color: 'var(--bd-danger)' }}>
                  {hint}
                </p>
              ) : done ? (
                <p className="bd-body-secondary" style={{ color: 'var(--bd-ok)' }}>
                  练习完成：你已经理解了 BodyDay 的尺度推进规则。可以进入人体总览开始真正的探索。
                </p>
              ) : (
                <p className="bd-caption">
                  按你的判断点击下一个应该进入的尺度（第 {step + 1} 步 / 共 {stations.length} 步）。
                </p>
              )}
            </div>

            <div className="bd-row" style={{ marginTop: 'var(--bd-space-4)' }}>
              <button
                type="button"
                className="bd-button bd-button--primary"
                onClick={() => navigate(ROUTES.body)}
              >
                {done ? '进入人体总览' : '跳过练习，直接进入'}
              </button>
              {done ? (
                <button
                  type="button"
                  className="bd-button bd-button--quiet"
                  onClick={() => {
                    setStep(0);
                    setDone(false);
                    setHint(null);
                  }}
                >
                  再做一次
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">边界</span>
            <h2 className="bd-section-title">科学示意与使用边界</h2>
          </div>
          <Notice tone="warn" title="请在阅读中保留这些前提">
            <ul className="bd-body-secondary" style={{ display: 'grid', gap: 8 }}>
              <li>· 三维模型是科普示意：器官不按真实比例，细胞为程序化概括形态，标注点为示意位置，未做逐点解剖配准。</li>
              <li>· BodyDay 不提供医学诊断、治疗方案或个体化建议；任何身体不适请咨询专业医务人员。</li>
              <li>· 「人体 → 细胞」的跨尺度切换是语义连续的镜头转场，不是在同一条几何上连续放大。</li>
              <li>· 未覆盖 3D 模型的结构会明确显示为「可阅读知识 / 暂无三维微观模型」，不会用不相关模型顶替。</li>
            </ul>
          </Notice>
        </section>

        <section className="bd-section">
          <div className="bd-stack bd-stack--tight">
            <span className="bd-label">来源</span>
            <h2 className="bd-section-title">本作品的科普依据</h2>
          </div>
          <SourceList ids={['S15', 'S02', 'S01', 'S05', 'S03', 'S10', 'S08', 'S18']} title="向导与免责声明所依据的来源" />
          <div className="bd-row">
            <Link className="bd-button" to={ROUTES.body}>
              进入人体总览
            </Link>
            <Link className="bd-button bd-button--quiet" to={ROUTES.about}>
              查看完整来源与方法
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
