/** Copy for UI /答辩：混合检索如何融合（与 vector-search 实现一致）。 */
export const RETRIEVAL_FUSION_STEPS = [
  {
    title: "两路召回",
    body: "向量腿（pgvector 语义相似度）与关键词腿（pg_trgm）各自取候选，互不替代。",
  },
  {
    title: "阈值过滤",
    body: "向量分 ≥ RAG_MIN_SCORE，或关键词分 ≥ RAG_KEYWORD_MIN_SCORE，满足其一即可保留。",
  },
  {
    title: "融合打分",
    body: "两路都命中：score（融合分）= w·vector（向量分）+ (1−w)·keyword（关键词分）（默认 w=0.6）；只命中一路：用该路分数。",
  },
  {
    title: "统一排序",
    body: "按融合分降序截断 topK（召回条数）；父子切片命中子块后展开父块，仍保留最佳子块分数。问答引用与检索工作台共用同一套分数与顺序。",
  },
] as const;

export const RETRIEVAL_FUSION_ENV = [
  { key: "RAG_HYBRID", label: "混合检索开关", meaning: "设为 0 则仅向量检索" },
  {
    key: "RAG_HYBRID_VECTOR_WEIGHT",
    label: "向量权重",
    meaning: "向量权重 w，默认 0.6",
  },
  {
    key: "RAG_MIN_SCORE",
    label: "向量最低分",
    meaning: "向量腿最低分，默认 0.42",
  },
  {
    key: "RAG_KEYWORD_MIN_SCORE",
    label: "关键词最低分",
    meaning: "关键词腿最低分，默认 0.12",
  },
] as const;