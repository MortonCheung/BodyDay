import { describe, expect, it } from 'vitest';
import { buildStructureCard, structureCardPath, structureCardPlacement } from './structureCard';

/**
 * 通用结构卡的边界：只输出真实字段，缺失即省略，绝不编造、绝不留防御性文案。
 */

const labels = { body: '整体', system: '系统', organ: '器官', cell: '细胞' };

const base = {
  kindLabels: labels,
  isPageSubject: false,
} as const;

describe('buildStructureCard', () => {
  it('未登记的真实结构 → 解剖结构卡，只有真实名称与所属系统', () => {
    const card = buildStructureCard({
      ...base,
      name: 'Femur',
      partName: null,
      system: '骨骼系统',
      entityKind: null,
    });
    expect(card).toEqual({
      title: 'Femur',
      category: '解剖结构',
      system: '骨骼系统',
      parent: null,
    });
  });

  it('点在已登记结构内部的局部结构 → 局部结构卡，并给出上级结构', () => {
    const card = buildStructureCard({
      ...base,
      name: '大脑',
      partName: 'Superior_frontal_gyrus',
      system: '神经系统',
      entityKind: 'organ',
    });
    expect(card).toEqual({
      title: 'Superior_frontal_gyrus',
      category: '局部结构',
      system: '神经系统',
      parent: '大脑',
    });
  });

  it('选中的就是页面主体本身 → 不出卡（本页科普卡已经在讲它）', () => {
    expect(
      buildStructureCard({
        ...base,
        name: '心脏',
        partName: null,
        system: '循环系统',
        entityKind: 'organ',
        isPageSubject: true,
      }),
    ).toBeNull();
  });

  it('页面主体内部的局部结构仍然出卡（不因是主体就吞掉被点中的小块）', () => {
    const card = buildStructureCard({
      ...base,
      name: '心脏',
      partName: 'Right_ventricle',
      system: '循环系统',
      entityKind: 'organ',
      isPageSubject: true,
    });
    expect(card?.title).toBe('Right_ventricle');
    expect(card?.parent).toBe('心脏');
  });

  it('没有系统归属时省略该字段，而不是补一段占位文字', () => {
    const card = buildStructureCard({
      ...base,
      name: 'Unknown structure',
      partName: null,
      system: null,
      entityKind: null,
    });
    expect(card?.system).toBeNull();
    expect(card?.category).toBe('解剖结构');
  });

  it('连名字都拿不到时不出卡，不编造名称', () => {
    expect(
      buildStructureCard({ ...base, name: null, partName: null, system: null, entityKind: null }),
    ).toBeNull();
  });
});

describe('卡片派生：路径与「这是哪里」', () => {
  it('局部结构才给出一条「上级 · 当前」路径，不自套娃', () => {
    const part = buildStructureCard({
      ...base,
      name: '大脑',
      partName: '额叶',
      system: '神经系统',
      entityKind: 'organ',
    });
    expect(structureCardPath(part)).toBe('大脑 · 额叶');

    const solo = buildStructureCard({
      ...base,
      name: 'Femur',
      partName: null,
      system: '骨骼系统',
      entityKind: null,
    });
    expect(structureCardPath(solo)).toBeNull();
  });

  it('「这是哪里」只使用真实系统归属，缺失即整行不渲染', () => {
    const withSystem = buildStructureCard({
      ...base,
      name: 'Femur',
      partName: null,
      system: '骨骼系统',
      entityKind: null,
    });
    expect(structureCardPlacement(withSystem)).toBe('位于骨骼系统。');

    const noSystem = buildStructureCard({
      ...base,
      name: 'Unknown',
      partName: null,
      system: null,
      entityKind: null,
    });
    expect(structureCardPlacement(noSystem)).toBeNull();
    expect(structureCardPlacement(null)).toBeNull();
  });
});
