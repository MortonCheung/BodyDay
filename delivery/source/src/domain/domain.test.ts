import { describe, expect, it } from 'vitest';
import {
  ENTITIES,
  ENTITY_MAP,
  LESSONS,
  RELATIONS,
  SCALES,
  SOURCES,
  SOURCE_MAP,
} from '../domain';

/**
 * 领域数据完整性测试。
 *
 * 这些断言是「不许造假」的自动化护栏：
 *  - 所有被引用的来源编号必须真实存在；
 *  - 所有关系端点必须是已登记的实体；
 *  - 所有课程步骤指向的实体必须真实存在；
 *  - 所有 atlas 结构 ID 必须来自已核验清单；
 *  - 不允许出现「器官 → 任意细胞」的兜底关系。
 */

const VERIFIED_ATLAS_STRUCTURE_IDS = new Set([
  'body-shell',
  'skeleton',
  'cerebrum',
  'cerebellum',
  'brainstem',
  'heart',
  'cardiac-internal-structures',
  'spleen',
  'lymphoid-organs',
]);

const PROCEDURAL_IDS = new Set([
  'neuron',
  'neuron-soma',
  'neuron-dendrite',
  'neuron-axon',
  'neuron-myelin',
  'leukocyte',
  'leukocyte-membrane',
  'leukocyte-cytoplasm',
  'leukocyte-nucleus',
]);

describe('来源表', () => {
  it('至少覆盖竞赛要求的权威来源', () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(15);
  });

  it('每个来源都有出版者、标题、链接与访问日期', () => {
    for (const s of SOURCES) {
      expect(s.id).toMatch(/^S\d{2}$/);
      expect(s.publisher.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.accessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.scope.length).toBeGreaterThan(0);
    }
  });

  it('来源编号唯一', () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('实体表', () => {
  it('实体 ID 唯一', () => {
    const ids = ENTITIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个实体的来源编号都存在', () => {
    for (const entity of ENTITIES) {
      expect(entity.sources.length).toBeGreaterThan(0);
      for (const id of entity.sources) {
        expect(SOURCE_MAP[id], `${entity.id} 引用了不存在的来源 ${id}`).toBeDefined();
      }
      for (const fact of entity.facts ?? []) {
        for (const id of fact.sourceIds) {
          expect(SOURCE_MAP[id], `${entity.id} 的 fact 引用了不存在的来源 ${id}`).toBeDefined();
        }
      }
      for (const health of entity.health ?? []) {
        for (const id of health.sourceIds) {
          expect(SOURCE_MAP[id], `${entity.id} 的 health 引用了不存在的来源 ${id}`).toBeDefined();
        }
      }
    }
  });

  it('上级实体引用合法', () => {
    for (const entity of ENTITIES) {
      if (entity.parentId) {
        expect(ENTITY_MAP[entity.parentId], `${entity.id} 的上级 ${entity.parentId} 不存在`).toBeDefined();
      }
    }
  });

  it('atlas 结构 ID 全部来自已核验清单，禁止猜测 ID', () => {
    for (const entity of ENTITIES) {
      if (entity.atlasStructureId) {
        expect(
          VERIFIED_ATLAS_STRUCTURE_IDS.has(entity.atlasStructureId),
          `${entity.id} 使用了未核验的 atlas 结构 ID：${entity.atlasStructureId}`,
        ).toBe(true);
      }
    }
  });

  it('程序化几何 ID 全部来自已实现的细胞几何', () => {
    for (const entity of ENTITIES) {
      if (entity.proceduralId) {
        expect(
          PROCEDURAL_IDS.has(entity.proceduralId),
          `${entity.id} 使用了未实现的程序化 ID：${entity.proceduralId}`,
        ).toBe(true);
      }
    }
  });

  it('物种尺度覆盖人体到细胞结构', () => {
    const kinds = new Set(ENTITIES.map((e) => e.kind));
    for (const scale of SCALES) {
      if (scale.id === 'tissue') continue; // 组织层以文本说明呈现，不设实体
      expect(kinds.has(scale.id), `缺少尺度层级的实体：${scale.id}`).toBe(true);
    }
  });

  it('没有待核实体进入正式科普正文', () => {
    const pending = ENTITIES.filter((e) => e.reviewStatus === 'pending');
    expect(pending.map((e) => e.id)).toEqual([]);
  });
});

describe('科学关系表', () => {
  it('关系端点全部存在', () => {
    for (const r of RELATIONS) {
      expect(ENTITY_MAP[r.fromId], `关系 ${r.id} 的起点不存在`).toBeDefined();
      expect(ENTITY_MAP[r.toId], `关系 ${r.id} 的终点不存在`).toBeDefined();
      expect(r.description.length).toBeGreaterThan(10);
      expect(r.sourceIds.length).toBeGreaterThan(0);
      for (const id of r.sourceIds) {
        expect(SOURCE_MAP[id], `关系 ${r.id} 引用了不存在的来源 ${id}`).toBeDefined();
      }
    }
  });

  it('关系 ID 唯一', () => {
    const ids = RELATIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('不存在「所有器官 → 任意细胞」的兜底关系', () => {
    // 明令禁止自动生成的全量兜底：每个器官到细胞的关联必须逐条登记
    const organs = ENTITIES.filter((e) => e.kind === 'organ').map((e) => e.id);
    const cells = new Set(ENTITIES.filter((e) => e.kind === 'cell').map((e) => e.id));
    const explicitPairs = new Set(
      RELATIONS.filter((r) => organs.includes(r.fromId) && cells.has(r.toId)).map(
        (r) => `${r.fromId}->${r.toId}`,
      ),
    );
    // 器官到细胞的关系只允许三个明确登记的组合
    expect(Array.from(explicitPairs).sort()).toEqual([
      'brain->neuron',
      'heart->leukocyte',
      'spleen->leukocyte',
    ]);
  });

  it('心脏与白细胞的关系必须是「循环输送」而不是「结构隶属」', () => {
    const relation = RELATIONS.find((r) => r.fromId === 'heart' && r.toId === 'leukocyte');
    expect(relation).toBeDefined();
    expect(relation!.relationType).toBe('circulates_through');
    // 必须显式澄清「不是在此生成」，这是本作品要纠正的核心误解之一
    expect(relation!.description).toMatch(/并不生成|骨髓/);
  });

  it('脾脏与白细胞的关系不得写成结构隶属', () => {
    const relation = RELATIONS.find(
      (r) => r.fromId === 'spleen' && r.toId === 'leukocyte' && r.relationType !== 'disease_context',
    );
    expect(relation).toBeDefined();
    expect(relation!.relationType).toBe('functional');
    expect(relation!.description).toMatch(/骨髓/);
  });

  it('疾病语境关系必须写明适用边界', () => {
    const disease = RELATIONS.filter((r) => r.relationType === 'disease_context');
    expect(disease.length).toBeGreaterThan(0);
    for (const r of disease) {
      expect(r.description.length).toBeGreaterThan(20);
    }
  });
});

describe('引导课程', () => {
  it('每套课程都有步骤、目标与来源', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(3);
    for (const lesson of LESSONS) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.sourceIds.length).toBeGreaterThan(0);
      expect(ENTITY_MAP[lesson.entryEntityId]).toBeDefined();
    }
  });

  it('每个步骤指向的实体真实存在', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.targetEntityId) {
          expect(
            ENTITY_MAP[step.targetEntityId],
            `${lesson.id}/${step.id} 指向了不存在的实体 ${step.targetEntityId}`,
          ).toBeDefined();
        }
        for (const id of step.sourceIds ?? []) {
          expect(SOURCE_MAP[id], `${lesson.id}/${step.id} 引用了不存在的来源 ${id}`).toBeDefined();
        }
      }
    }
  });

  it('交互步骤使用合法的交互指令语法', () => {
    const valid = /^(rotate|focus:[a-z-]+|select:[a-z-]+|drilldown:[a-z-]+|answer)$/;
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (!step.requiredInteraction) continue;
        expect(
          valid.test(step.requiredInteraction),
          `${lesson.id}/${step.id} 的交互指令非法：${step.requiredInteraction}`,
        ).toBe(true);
      }
    }
  });

  it('跨尺度步骤的目标必须真的有程序化模型', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.requiredInteraction?.startsWith('drilldown:')) {
          const target = ENTITY_MAP[step.requiredInteraction.split(':')[1]];
          expect(target, `drilldown 目标不存在：${step.requiredInteraction}`).toBeDefined();
          expect(
            target!.proceduralId,
            `drilldown 目标没有可渲染模型：${step.requiredInteraction}`,
          ).toBeDefined();
        }
      }
    }
  });

  it('至少提供 3 个有效测验情境', () => {
    const quizzes = LESSONS.flatMap((l) => l.steps.filter((s) => s.question));
    expect(quizzes.length).toBeGreaterThanOrEqual(3);
    for (const step of quizzes) {
      const q = step.question!;
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.some((o) => o.key === q.answerKey)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(20);
      expect(q.sourceIds.length).toBeGreaterThan(0);
      for (const id of q.sourceIds) {
        expect(SOURCE_MAP[id], `测验 ${q.id} 引用了不存在的来源 ${id}`).toBeDefined();
      }
    }
  });

  it('测验不考无意义的数字记忆', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (!step.question) continue;
        const correct = step.question.options.find((o) => o.key === step.question!.answerKey);
        expect(
          /\d{3,}/.test(correct?.text ?? ''),
          `测验 ${step.question.id} 的正确答案疑似数字记忆题`,
        ).toBe(false);
      }
    }
  });
});
