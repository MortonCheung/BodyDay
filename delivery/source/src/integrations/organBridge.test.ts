import { describe, expect, it } from 'vitest';
import {
  ORGAN_BRIDGE,
  ORGAN_DETAIL_STRUCTURE,
  VERIFIED_ORGAN_IDS,
  isVerifiedOrgan,
  organDisplayName,
  organTargetForStructure,
  resolveOrganDetail,
} from './organBridge';

/**
 * organBridge 的边界：人工核对表 + 精确查表。
 *
 * 这里最重要的两条断言：
 * 1. 只做精确结构 ID 查表，不存在 `name.includes('brain')` 式的模糊匹配；
 * 2. `spleen` 绝不能映射成 `pancreas` 或任何别的器官（手册明令）。
 */

describe('organTargetForStructure 精确查表', () => {
  it('心脏 / 大脑（端脑）/ 肺 / 脾脏 映射到自身器官', () => {
    expect(organTargetForStructure('heart')).toBe('heart');
    expect(organTargetForStructure('cerebrum')).toBe('brain');
    expect(organTargetForStructure('lungs')).toBe('lungs');
    expect(organTargetForStructure('spleen')).toBe('spleen');
  });

  it('端脑下的小脑 / 脑干沿已核实映射归到脑', () => {
    expect(organTargetForStructure('cerebellum')).toBe('brain');
    expect(organTargetForStructure('brainstem')).toBe('brain');
  });

  it('不做子串或模糊匹配：包含 brain 的任意字符串不会命中', () => {
    expect(organTargetForStructure('left-brain-region')).toBeNull();
    expect(organTargetForStructure('brain-like')).toBeNull();
    expect(organTargetForStructure('not-heart')).toBeNull();
  });

  it('未知结构 / 空值返回 null，不猜、不兜底', () => {
    expect(organTargetForStructure('femur')).toBeNull();
    expect(organTargetForStructure(null)).toBeNull();
    expect(organTargetForStructure(undefined)).toBeNull();
  });
});

describe('脾脏不得与胰腺混淆', () => {
  const spleenRow = ORGAN_BRIDGE.find((row) => row.sourceId === 'spleen');
  const pancreasRow = ORGAN_BRIDGE.find((row) => row.sourceId === 'pancreas');

  it('spleen 只映射到 spleen', () => {
    expect(spleenRow?.target).toBe('spleen');
    expect(organTargetForStructure('spleen')).not.toBe('pancreas');
  });

  it('pancreas 为 needs-review 且 target 为空（隐藏入口）', () => {
    expect(pancreasRow?.certainty).toBe('needs-review');
    expect(pancreasRow?.target).toBeNull();
    expect(isVerifiedOrgan('pancreas')).toBe(false);
  });
});

describe('verified / needs-review 分界', () => {
  it('verified 行都有 target，且都在可进入名单里', () => {
    const verified = ORGAN_BRIDGE.filter((row) => row.certainty === 'verified');
    expect(verified.length).toBeGreaterThan(0);
    for (const row of verified) {
      expect(row.target).toBeTruthy();
      expect(VERIFIED_ORGAN_IDS).toContain(row.target as string);
    }
  });

  it('needs-review 行一律没有 target，且不能进入详情', () => {
    const pending = ORGAN_BRIDGE.filter((row) => row.certainty === 'needs-review');
    expect(pending.length).toBeGreaterThan(0);
    for (const row of pending) {
      expect(row.target).toBeNull();
      expect(isVerifiedOrgan(row.sourceId)).toBe(false);
      expect(resolveOrganDetail(row.sourceId)).toBeNull();
    }
  });
});

describe('resolveOrganDetail', () => {
  it('肺：真实结构 ID 为 lungs，内容缺失「与健康的关系」时不编造', () => {
    const spec = resolveOrganDetail('lungs');
    expect(spec?.structureId).toBe('lungs');
    expect(ORGAN_DETAIL_STRUCTURE.lungs).toBe('lungs');
    expect(spec?.entity.id).toBe('lungs');
    expect(spec?.entity.health).toBeUndefined();
    // 分叶等结构事实来自本工程真实渲染的图谱（S17）
    expect(spec?.entity.facts?.some((f) => f.sourceIds.includes('S17'))).toBe(true);
  });

  it('心脏 / 大脑 / 脾脏 复用已登记实体', () => {
    expect(resolveOrganDetail('heart')?.entity.id).toBe('heart');
    expect(resolveOrganDetail('brain')?.structureId).toBe('cerebrum');
    expect(resolveOrganDetail('spleen')?.entity.id).toBe('spleen');
  });

  it('未核实器官返回 null（页面对应入口隐藏）', () => {
    expect(resolveOrganDetail('eyeball')).toBeNull();
    expect(resolveOrganDetail('skin')).toBeNull();
    expect(resolveOrganDetail('')).toBeNull();
  });

  it('器官展示名只对已核实器官给出', () => {
    expect(organDisplayName('lungs')).toBe('肺');
    expect(organDisplayName('eyeball')).toBeNull();
  });
});
