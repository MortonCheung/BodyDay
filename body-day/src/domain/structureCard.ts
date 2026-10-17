/**
 * 通用结构卡：把「点到的真实解剖节点」变成一张只讲事实的卡。
 *
 * 为什么要有它：整具人体有 749 个结构 ID，本作品只对少数结构编写了经核对的科普内容。
 * 对剩余大量真实存在的节点，面板不能留白、也不能写「尚未编入科普卡片」这类防御句，
 * 更不能用别的结构冒充——做法是**只用图谱里真实存在的字段**生成一张简洁卡：
 * 真实结构名（已核对中文名优先，否则真实英文解剖名）、结构类别、所属系统、上级结构。
 * 上游元数据里没有「功能」这类必须人工核对的内容时就不输出该字段（字段缺失即整行不显示），
 * 因此这张卡永远不会出现编造的知识。
 *
 * 纯函数、无 IO：同样的输入必然得到同样的输出，便于单测。
 */

export interface StructureCardData {
  /** 结构名（已核对中文名优先；未核对时是真实英文解剖名） */
  title: string;
  /** 结构类别：局部结构 / 器官 / 系统 / 细胞 / 整体 / 解剖结构 */
  category: string;
  /** 所属系统（中文），图谱没有系统归属时为 null */
  system: string | null;
  /** 上级结构：仅在「点在已登记结构内部」时可确定，否则为 null */
  parent: string | null;
}

export interface StructureCardInput {
  /** 被点结构自身的真实英文解剖名（图谱节点名） */
  name: string | null;
  /** 与上级不同时，被点中的那一小块的真实解剖名 */
  partName: string | null;
  /** 所属系统（中文），来自图谱系统归属 */
  system: string | null;
  /** 映射到的已登记实体的类别（body/system/organ/cell），未登记则为 null */
  entityKind: string | null;
  /** 其中「结构类别」的中文名表，由调用方给出以保持纯函数无依赖 */
  kindLabels: Record<string, string>;
  /** 选中的就是当前页面主体本身（此时本页科普卡已经在讲它，不应重复出卡） */
  isPageSubject: boolean;
}

/**
 * 生成通用结构卡。
 *
 * 返回 null 的两种情况（都不该出卡）：
 * 1. 选中的是当前页面主体自身、且没有点到更细的局部——页面主体卡已经在讲它；
 * 2. 连结构名都拿不到——宁可不显示，也不编一个名字。
 */
export function buildStructureCard(input: StructureCardInput): StructureCardData | null {
  const isPart = Boolean(input.partName);
  if (!isPart && input.isPageSubject) return null;

  const title = input.partName ?? input.name;
  if (!title) return null;

  return {
    title,
    category: isPart
      ? '局部结构'
      : input.entityKind
        ? input.kindLabels[input.entityKind] ?? '解剖结构'
        : '解剖结构',
    system: input.system,
    // 局部结构的上级就是它所属的那个已登记结构（如大脑）；独立结构没有可信上级就留空
    parent: isPart ? input.name : null,
  };
}
