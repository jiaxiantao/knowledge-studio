import type {
  RagEvalCase,
  RagEvalCaseSetId,
  RagEvalCaseSetMeta,
} from "@/lib/rag-eval/types";

/**
 * Built-in golden sets aligned to local corpora:
 * - 软考相关知识
 * - 我的技术博客
 *
 * Name needles match real filenames; content needles are optional and AND-ed
 * when both are present (tighter than OR-only matching).
 */
export const RAG_EVAL_CASE_SET_META: RagEvalCaseSetMeta[] = [
  {
    id: "soft-exam",
    label: "软考相关知识",
    description: "对齐「软考相关知识」库：论文写作、案例分析、机考指南等",
    preferredKbNameIncludes: ["软考"],
  },
  {
    id: "tech-blog",
    label: "我的技术博客",
    description: "对齐「我的技术博客」库：Cursor / Agent / cos-design / MCP 等",
    preferredKbNameIncludes: ["技术博客", "博客"],
  },
  {
    id: "mixed",
    label: "软考 + 博客精选",
    description: "两套精选用例合并；请同时勾选对应知识库，或分库各跑一轮",
    preferredKbNameIncludes: ["软考", "技术博客", "博客"],
  },
];

const SOFT_EXAM_CASES: RagEvalCase[] = [
  {
    id: "soft-integration-essay",
    query: "整合管理论文写作思路",
    expectedDocumentNameIncludes: ["整合管理论文写作思路"],
    matchMode: "name_only",
    notes: "精确文件名片段",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-wbs-principles",
    query: "历年案例分析理论题汇总 创建WBS 原则",
    expectedDocumentNameIncludes: ["案例分析理论题汇总", "高项必背"],
    matchMode: "name_only",
    notes: "案例分析必背册（OCR 噪声大，只卡文档名）",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-quality-plan",
    query: "09 质量管理论文写作思路",
    expectedDocumentNameIncludes: ["质量管理论文写作思路", "【2-5】质量"],
    matchMode: "name_only",
    notes: "质量管理论文",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-schedule-essay",
    query: "进度管理论文写作思路",
    expectedDocumentNameIncludes: ["进度管理论文写作思路"],
    matchMode: "name_only",
    notes: "进度管理论文",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-procurement-control",
    query: "采购管理论文写作思路",
    expectedDocumentNameIncludes: ["采购管理论文写作思路"],
    matchMode: "name_only",
    notes: "采购管理论文",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-exam-drawing-guide",
    query: "【官方】软考机考-绘图指南",
    expectedDocumentNameIncludes: ["绘图指南", "软考机考"],
    matchMode: "name_only",
    notes: "官方机考绘图指南",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-mindmap",
    query: "思维导图学员分享",
    expectedDocumentNameIncludes: ["思维导图"],
    matchMode: "name_only",
    notes: "思维导图 PDF",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-cost-essay",
    query: "成本管理论文写作思路",
    expectedDocumentNameIncludes: ["成本管理论文写作思路"],
    matchMode: "name_only",
    notes: "成本管理论文",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-should-miss-scenic",
    query: "今天杭州西湖景区的开放时间是几点",
    expectHit: false,
    // Soft-exam OCR/hybrid often returns weak spurious hits; only fail on strong top-1.
    rejectBelowScore: 0.88,
    notes: "应拒答：与软考无关；Top1≥0.88 才算拒答失败",
    sets: ["soft-exam", "mixed"],
  },
  {
    id: "soft-should-miss-finance",
    query: "美联储最新一次议息会议的利率决议是什么",
    expectHit: false,
    rejectBelowScore: 0.88,
    notes: "应拒答：时政金融不在库内",
    sets: ["soft-exam", "mixed"],
  },
];

const TECH_BLOG_CASES: RagEvalCase[] = [
  {
    id: "blog-cursor-modes",
    query: "Cursor四模式选型指南 Ask Plan Agent Debug",
    expectedDocumentNameIncludes: ["Cursor四模式选型指南"],
    matchMode: "name_only",
    notes: "Cursor 四模式",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-cursor-worktree",
    query: "Cursor多Agent与Worktree并行开发实战",
    expectedDocumentNameIncludes: ["Worktree并行开发"],
    matchMode: "name_only",
    notes: "Worktree 并行",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-mcp-workflow",
    query: "用MCP把Figma语雀GitLab串成一条前端工作流",
    expectedDocumentNameIncludes: ["用MCP把Figma语雀GitLab"],
    matchMode: "name_only",
    notes: "MCP 工作流",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-cos-design",
    query: "cos-design从视觉Demo到可发布组件库的完整实践",
    expectedDocumentNameIncludes: ["cos-design-从视觉Demo"],
    matchMode: "name_only",
    notes: "cos-design 主文",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-agent-eval",
    query: "Agent能跑不等于能上线-前端用评测集给AI装上回归测试",
    expectedDocumentNameIncludes: ["评测集给AI", "Agent能跑不等于能上线"],
    matchMode: "name_only",
    notes: "Agent 评测集文",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-glb-pipeline",
    query: "浏览器端3D项目GLB工程化全链路-分析压缩归一化",
    expectedDocumentNameIncludes: ["GLB工程化全链路", "GLB工程化"],
    matchMode: "name_only",
    notes: "GLB 工程化",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-context-engineering",
    query: "Context-Engineering 从Prompt到Agent上下文系统",
    expectedDocumentNameIncludes: ["Context-Engineering"],
    matchMode: "name_only",
    notes: "Context Engineering",
    sets: ["tech-blog", "mixed"],
  },
  {
    id: "blog-should-miss-scenic",
    query: "上海迪士尼乐园今日门票价格",
    expectHit: false,
    rejectBelowScore: 0.88,
    notes: "应拒答：与技术博客无关",
    sets: ["tech-blog", "mixed"],
  },
];

/** Deduped catalog (mixed set references shared ids). */
export const ALL_RAG_EVAL_CASES: RagEvalCase[] = (() => {
  const byId = new Map<string, RagEvalCase>();
  for (const item of [...SOFT_EXAM_CASES, ...TECH_BLOG_CASES]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item, sets: [...(item.sets ?? [])] });
      continue;
    }
    existing.sets = [
      ...new Set([...(existing.sets ?? []), ...(item.sets ?? [])]),
    ];
  }
  return [...byId.values()];
})();

export function getRagEvalCaseSetMeta(caseSet: RagEvalCaseSetId) {
  return (
    RAG_EVAL_CASE_SET_META.find((item) => item.id === caseSet) ??
    RAG_EVAL_CASE_SET_META[0]
  );
}

export function getRagEvalCases(caseSet: RagEvalCaseSetId = "soft-exam") {
  return ALL_RAG_EVAL_CASES.filter((item) =>
    (item.sets ?? []).includes(caseSet),
  ).map((item) => ({ ...item, sets: [...(item.sets ?? [])] }));
}

/** @deprecated Prefer getRagEvalCases("soft-exam") */
export function getDefaultRagEvalCases() {
  return getRagEvalCases("soft-exam");
}
