import type { GuidedLesson } from './types';

/**
 * BodyDay 引导课程。
 *
 * 铁律：课程步骤必须指向**真实模型结构**，并要求用户完成可检测的真实交互，
 * 不是 PPT 式翻页。`requiredInteraction` 采用如下约定：
 *   `rotate`               — 在舞台上转动模型
 *   `focus:<entityId>`     — 在人体模型中对某结构发起聚焦
 *   `select:<entityId>`    — 在器官/细胞模型选中某结构（须为模型内真实热点）
 *   `drilldown:<entityId>` — 从当前尺度进入下一尺度（真实换模型 + 尺度交代）
 *   `answer`               — 完成本步骤附带的测验
 */
export const LESSONS: GuidedLesson[] = [
  /* ================= 神经科普课 ================= */
  {
    id: 'neural',
    title: '神经科普课',
    theme: '神经信号与神经系统健康',
    goal: '从脑出发，看清神经组织中的神经元如何接收与传递信号，并理解睡眠与身体活动对神经系统的意义。',
    entryEntityId: 'brain',
    sourceIds: ['S01', 'S02', 'S06', 'S08', 'S10'],
    steps: [
      {
        id: 'neural-01',
        kind: 'observe',
        title: '先看这一块：脑',
        body: '这里是人体模型中的脑。先转动模型，确认它在颅腔中的位置与整体形态。',
        targetEntityId: 'brain',
        requiredInteraction: 'rotate',
        sourceIds: ['S06'],
      },
      {
        id: 'neural-02',
        kind: 'interact',
        title: '聚焦大脑',
        body: '点击「聚焦」把镜头推进到端脑。注意：这是镜头在同一个模型里推进，不是换了一个模型。',
        targetEntityId: 'brain',
        requiredInteraction: 'focus:brain',
        sourceIds: ['S06'],
      },
      {
        id: 'neural-03',
        kind: 'explain',
        title: '脑不是「一堆神经元」，而是有层级的组织',
        body: '脑属于中枢神经系统，由神经组织构成。神经组织里有神经元，也有起支持与绝缘作用的神经胶质细胞。所以「大脑 → 神经元」表达的是「神经组织相关细胞」的关系，而不是「某个脑区只有一种神经元」。',
        targetEntityId: 'brain',
        sourceIds: ['S01', 'S02'],
      },
      {
        id: 'neural-04',
        kind: 'interact',
        title: '向下进入细胞层',
        body: '现在跨尺度向下：离开人体尺度，进入神经元模型。这一步会更换模型，屏幕会先显示尺度轴，提示你「尺度变了」。',
        targetEntityId: 'neuron',
        requiredInteraction: 'drilldown:neuron',
        sourceIds: ['S01'],
      },
      {
        id: 'neural-05',
        kind: 'interact',
        title: '逐个认出三个部件',
        body: '依次点选胞体、树突、轴突。这三个部件承担不同的角色：树突主要接收，胞体主要整合，轴突主要输出。',
        targetEntityId: 'neuron',
        requiredInteraction: 'select:neuron-dendrite',
        sourceIds: ['S01'],
      },
      {
        id: 'neural-06',
        kind: 'observe',
        title: '髓鞘：让信号更快',
        body: '轴突上可以看到分段包绕的髓鞘。髓鞘是绝缘结构，使电信号沿轴突传导得更快、更稳定。',
        targetEntityId: 'neuron-myelin',
        requiredInteraction: 'select:neuron-myelin',
        sourceIds: ['S01'],
      },
      {
        id: 'neural-07',
        kind: 'quiz',
        title: '第一个检验',
        body: '先回答一个问题，确认你抓住的是机制，不是名词。',
        targetEntityId: 'neuron',
        requiredInteraction: 'answer',
        question: {
          id: 'q-neural-1',
          prompt: '神经元的哪一部分主要负责接收来自其他细胞的信息？',
          options: [
            { key: 'A', text: '轴突' },
            { key: 'B', text: '树突' },
            { key: 'C', text: '髓鞘' },
            { key: 'D', text: '细胞核' },
          ],
          answerKey: 'B',
          explanation: '树突是从胞体伸出的分支结构，扩大接收面积，把信号传向胞体；轴突是输出端，髓鞘只负责加快传导而不接收信号。',
          sourceIds: ['S01'],
        },
        sourceIds: ['S01'],
      },
      {
        id: 'neural-08',
        kind: 'quiz',
        title: '第二个检验：把关系说准确',
        body: '关系一旦说错，科普就会变成误导。请选最准确的一项。',
        targetEntityId: 'brain',
        requiredInteraction: 'answer',
        question: {
          id: 'q-neural-2',
          prompt: '关于「大脑 → 神经元」，下列哪种表述最科学？',
          options: [
            { key: 'A', text: '大脑里只有一种神经元' },
            { key: 'B', text: '大脑的神经组织中含大量神经元，神经元类型多样' },
            { key: 'C', text: '神经元是脑内唯一的细胞类型' },
            { key: 'D', text: '所有神经元都在大脑中生成' },
          ],
          answerKey: 'B',
          explanation: '脑由神经组织构成，其中神经元数量众多且类型多样，同时还存在大量神经胶质细胞。把「脑」等同于「某一种神经元」是不准确的。',
          sourceIds: ['S01', 'S02'],
        },
        sourceIds: ['S01', 'S02'],
      },
      {
        id: 'neural-09',
        kind: 'explain',
        title: '这些结构与你的健康有什么关系',
        body: '神经系统的功能状态与生活方式相关：长期睡眠不足会影响注意力、记忆与情绪调节；规律身体活动则与更好的整体健康与脑健康指标相关。这里说的是健康行为关联，不是治疗手段，也不能替代任何医学诊断。',
        targetEntityId: 'brain',
        sourceIds: ['S08', 'S10'],
      },
      {
        id: 'neural-10',
        kind: 'summary',
        title: '本章小结',
        body: '你完成了：脑的结构观察 → 体内聚焦 → 跨尺度进入神经元 → 认出胞体/树突/轴突/髓鞘 → 两个机制测验。可以在「学习总结」页查看你已发现的结构。',
        targetEntityId: 'neuron',
        sourceIds: ['S01', 'S02', 'S06', 'S08', 'S10'],
      },
    ],
  },

  /* ================= 免疫科普课 ================= */
  {
    id: 'immune',
    title: '免疫科普课',
    theme: '免疫细胞如何参与防御',
    goal: '从脾脏出发，理解免疫器官与免疫细胞的功能关联，并说清白细胞真实的生成位置与到达方式。',
    entryEntityId: 'spleen',
    sourceIds: ['S04', 'S05', 'S08', 'S11', 'S18'],
    steps: [
      {
        id: 'immune-01',
        kind: 'observe',
        title: '先看这一块：脾脏',
        body: '脾脏位于左上腹，是人体最大的淋巴器官。先转动模型看清它的大致位置与形态。',
        targetEntityId: 'spleen',
        requiredInteraction: 'rotate',
        sourceIds: ['S05'],
      },
      {
        id: 'immune-02',
        kind: 'interact',
        title: '聚焦脾脏',
        body: '把镜头推进到脾脏，观察它在淋巴系统中的位置。',
        targetEntityId: 'spleen',
        requiredInteraction: 'focus:spleen',
        sourceIds: ['S05'],
      },
      {
        id: 'immune-03',
        kind: 'explain',
        title: '脾脏为什么属于免疫相关器官',
        body: '淋巴系统是免疫系统的重要结构基础。脾脏过滤血液，是免疫细胞聚集、识别与应答的重要场所之一。因此 BodyDay 用「功能相关」来描述「脾脏 — 白细胞」，而不是「结构隶属」。',
        targetEntityId: 'spleen',
        sourceIds: ['S05'],
      },
      {
        id: 'immune-04',
        kind: 'interact',
        title: '进入白细胞',
        body: '跨尺度向下，进入白细胞模型。请特别注意接下来要纠正的一个常见误解：白细胞不是脾脏生产的。',
        targetEntityId: 'leukocyte',
        requiredInteraction: 'drilldown:leukocyte',
        sourceIds: ['S04'],
      },
      {
        id: 'immune-05',
        kind: 'interact',
        title: '认出白细胞的关键部件',
        body: '依次点选细胞膜、细胞质与细胞核。不同白细胞的核形态差异明显，这是临床分类的依据之一。',
        targetEntityId: 'leukocyte',
        requiredInteraction: 'select:leukocyte-nucleus',
        sourceIds: ['S04', 'S05'],
      },
      {
        id: 'immune-06',
        kind: 'explain',
        title: '白细胞到底从哪里来',
        body: '白细胞是免疫细胞的总称，包含中性粒细胞、淋巴细胞、单核细胞等，它们主要在骨髓中生成，随后随血液与淋巴循环到达全身组织。心脏提供的是循环动力，脾脏提供的是免疫应答场所 —— 二者都不是白细胞的生成地。',
        targetEntityId: 'leukocyte',
        sourceIds: ['S04', 'S05'],
      },
      {
        id: 'immune-07',
        kind: 'quiz',
        title: '第一个检验',
        body: '这一题针对最常见的误解。',
        targetEntityId: 'leukocyte',
        requiredInteraction: 'answer',
        question: {
          id: 'q-immune-1',
          prompt: '白细胞主要在什么部位生成？',
          options: [
            { key: 'A', text: '心脏' },
            { key: 'B', text: '脾脏' },
            { key: 'C', text: '骨髓' },
            { key: 'D', text: '肺' },
          ],
          answerKey: 'C',
          explanation: '血细胞（包括白细胞）主要在骨髓中生成。心脏负责泵血、脾脏是免疫应答场所，都不是白细胞的生成地。',
          sourceIds: ['S04'],
        },
        sourceIds: ['S04'],
      },
      {
        id: 'immune-08',
        kind: 'quiz',
        title: '第二个检验：免疫接种的意义',
        body: '理解机制，而不是背结论。',
        targetEntityId: 'leukocyte',
        requiredInteraction: 'answer',
        question: {
          id: 'q-immune-2',
          prompt: '免疫接种（疫苗）发挥作用的方式，更接近下列哪一项？',
          options: [
            { key: 'A', text: '直接杀死体内所有病原体' },
            { key: 'B', text: '让免疫系统提前识别病原体特征，从而在真实感染时更快应答' },
            { key: 'C', text: '用外来细胞替换免疫细胞' },
            { key: 'D', text: '单纯补充营养' },
          ],
          answerKey: 'B',
          explanation: '免疫接种通过让免疫系统提前「认识」病原体特征，使真实感染发生时能更快、更有效地启动应答。它不是直接杀菌，也不是替换细胞。',
          sourceIds: ['S18'],
        },
        sourceIds: ['S18'],
      },
      {
        id: 'immune-09',
        kind: 'explain',
        title: '哪些生活方式与免疫功能相关',
        body: '充足睡眠、均衡膳食与规律身体活动是支持免疫功能的基础性生活方式因素。这里给出的是有依据的健康行为方向，不构成任何个体化医疗建议。',
        targetEntityId: 'spleen',
        sourceIds: ['S08', 'S10', 'S11'],
      },
      {
        id: 'immune-10',
        kind: 'summary',
        title: '本章小结',
        body: '你完成了：脾脏观察 → 体内聚焦 → 跨尺度进入白细胞 → 认出膜/质/核 → 纠正「白细胞在脾脏或心脏生成」的误解 → 两个机制测验。',
        targetEntityId: 'leukocyte',
        sourceIds: ['S04', 'S05', 'S18'],
      },
    ],
  },

  /* ================= 循环关联课 ================= */
  {
    id: 'circulation',
    title: '循环关联课',
    theme: '血液循环如何运输细胞与物质',
    goal: '理解心脏作为动力泵的角色，并正确描述血液如何把细胞与物质运输到全身。',
    entryEntityId: 'heart',
    sourceIds: ['S03', 'S04', 'S07', 'S12'],
    steps: [
      {
        id: 'circ-01',
        kind: 'observe',
        title: '先看这一块：心脏',
        body: '心脏是循环系统的动力泵。先转动模型，观察它的整体外形与朝向。',
        targetEntityId: 'heart',
        requiredInteraction: 'rotate',
        sourceIds: ['S03'],
      },
      {
        id: 'circ-02',
        kind: 'interact',
        title: '聚焦心脏',
        body: '把镜头推进到心脏，准备观察它的内部结构与血液流向。',
        targetEntityId: 'heart',
        requiredInteraction: 'focus:heart',
        sourceIds: ['S03'],
      },
      {
        id: 'circ-03',
        kind: 'explain',
        title: '四个腔与单向流动',
        body: '心脏有右心房、右心室、左心房、左心室四个腔。房室瓣与半月瓣保证血液单向流动、防止倒流。这是「泵」能有效工作的机械前提。',
        targetEntityId: 'heart',
        sourceIds: ['S03'],
      },
      {
        id: 'circ-04',
        kind: 'observe',
        title: '血液里运的是什么',
        body: '血液由血浆、红细胞、白细胞与血小板组成。它运输氧气、营养物质、代谢产物，同时也运输各类血细胞。',
        targetEntityId: 'heart',
        sourceIds: ['S04'],
      },
      {
        id: 'circ-05',
        kind: 'interact',
        title: '与白细胞的真实关系',
        body: '在关系图里查看「心脏 — 白细胞」：它被标注为「循环输送」。白细胞随血液被输送到全身，因此会流经心脏；但白细胞主要在骨髓生成，心脏不生产白细胞。',
        targetEntityId: 'leukocyte',
        requiredInteraction: 'drilldown:leukocyte',
        sourceIds: ['S03', 'S04'],
      },
      {
        id: 'circ-06',
        kind: 'quiz',
        title: '第一个检验：把关系说准确',
        body: '关系类型不同，含义完全不同。',
        targetEntityId: 'heart',
        requiredInteraction: 'answer',
        question: {
          id: 'q-circ-1',
          prompt: '关于「心脏 — 白细胞」的关系，下列哪项最准确？',
          options: [
            { key: 'A', text: '心脏生成白细胞' },
            { key: 'B', text: '白细胞随血液流经心脏，被循环系统输送到全身' },
            { key: 'C', text: '心脏储存并释放白细胞' },
            { key: 'D', text: '心脏是白细胞唯一的存在部位' },
          ],
          answerKey: 'B',
          explanation: '这是循环输送关系：心脏提供泵血动力，白细胞主要在骨髓生成后随血液到达全身。把循环输送说成「生成」或「储存」都不准确。',
          sourceIds: ['S03', 'S04'],
        },
        sourceIds: ['S03', 'S04'],
      },
      {
        id: 'circ-07',
        kind: 'quiz',
        title: '第二个检验：机械结构',
        body: '理解结构如何保证功能。',
        targetEntityId: 'heart',
        requiredInteraction: 'answer',
        question: {
          id: 'q-circ-2',
          prompt: '心脏中保证血液单向流动、防止倒流的结构是？',
          options: [
            { key: 'A', text: '心房' },
            { key: 'B', text: '心室' },
            { key: 'C', text: '瓣膜' },
            { key: 'D', text: '心包' },
          ],
          answerKey: 'C',
          explanation: '房室瓣与半月瓣在压力变化时开闭，保证血液只能朝一个方向流动；心房与心室是腔室，心包是包裹心脏的膜性结构。',
          sourceIds: ['S03'],
        },
        sourceIds: ['S03'],
      },
      {
        id: 'circ-08',
        kind: 'explain',
        title: '循环健康与生活方式',
        body: '高血压是心血管疾病的重要危险因素。减少高盐饮食、保持规律的中等强度身体活动，是面向大众的有依据的健康行为方向。任何血压异常的判断都需要专业测量与临床评估。',
        targetEntityId: 'heart',
        sourceIds: ['S12', 'S07', 'S10'],
      },
      {
        id: 'circ-09',
        kind: 'summary',
        title: '本章小结',
        body: '你完成了：心脏观察 → 体内聚焦 → 理解四腔与瓣膜 → 分清「循环输送」与「生成」 → 两个机制测验。回到人体，你还可以继续探索神经系统与淋巴系统。',
        targetEntityId: 'heart',
        sourceIds: ['S03', 'S04', 'S07', 'S12'],
      },
    ],
  },
];

export const LESSON_MAP: Record<string, GuidedLesson> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l]),
);

export function getLesson(id: string | null | undefined): GuidedLesson | undefined {
  if (!id) return undefined;
  return LESSON_MAP[id];
}

/** 全部测验题（用于学习总结页统计与复习） */
export function allQuizQuestions() {
  return LESSONS.flatMap((l) =>
    l.steps
      .filter((s) => s.question)
      .map((s) => ({ lessonId: l.id, lessonTitle: l.title, stepId: s.id, question: s.question! })),
  );
}
