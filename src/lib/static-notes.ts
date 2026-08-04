import type { NoteRecord } from "@/lib/note-types";

const now = "2026-01-01T00:00:00.000Z";

export const staticNotes: NoteRecord[] = [
  {
    id: "static-architecture-review-checkpoints",
    title: "架构评审时我最先确认的事情",
    slug: "architecture-review-checkpoints",
    summary: "记录我在复杂页面或系统评审时优先确认的边界、数据流和演进风险。",
    contentMarkdown:
      "我通常不会先看页面长什么样，而是先确认边界、数据流、状态落点和后续迭代方式。只要这几件事没理顺，组件拆分和技术选型都很容易漂移。",
    tags: ["架构", "评审", "系统设计"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "static-performance-debug-default-order",
    title: "性能排查的默认顺序",
    slug: "performance-debug-default-order",
    summary: "把性能问题拆成资源、渲染、状态更新和异常链路几个维度。",
    contentMarkdown:
      "排查性能时，我会先确认是不是核心链路问题，再看资源加载、渲染路径、状态更新、第三方脚本和异常链路。这样可以避免一开始就陷入局部优化。",
    tags: ["性能", "排查", "体验治理"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "static-ai-workflow-in-engineering",
    title: "我如何把 AI 放进日常工程流程",
    slug: "ai-workflow-in-engineering",
    summary: "重点不是让 AI 单次生成得更漂亮，而是让它进入稳定、可校验的工作流。",
    contentMarkdown:
      "我更关注 AI 是否理解项目结构、规则和已有内容，再让结果进入 lint、typecheck、build 和人工 review。只要校验链路在，AI 才能真正长期参与工程。",
    tags: ["AI", "工作流", "工程化"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "static-bff-layer-in-frontend-systems",
    title: "BFF 聚合层在前端系统中的位置",
    slug: "bff-layer-in-frontend-systems",
    summary: "用 dashboard / profile 等聚合接口减少页面瀑布请求，并把类型边界放在服务端。",
    contentMarkdown:
      "首页看板不会分别打五个接口，而是通过 /api/dashboard 一次拿到 overview、knowledge、flow 和 analytics。这样前端只关心展示与交互，数据拼装和降级策略集中在 BFF。",
    tags: ["架构", "BFF", "全栈"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "static-notes-search-pg-trgm-vs-memory",
    title: "笔记检索：pg_trgm 与内存打分的取舍",
    slug: "notes-search-pg-trgm-vs-memory",
    summary: "有扩展时用相似度排序，没有时回退 token 打分，API 用 engine 参数可强制对比。",
    contentMarkdown:
      "生产环境优先启用 pg_trgm，开发机没权限时自动回退 memory。工程 Demo 里并行请求两种 engine，能直观看到排序差异和延迟特征。",
    tags: ["PostgreSQL", "检索", "pg_trgm"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "static-cross-platform-capability-matrix",
    title: "大前端选型：先画能力矩阵再选框架",
    slug: "cross-platform-capability-matrix",
    summary: "H5、小程序、桌面壳共享业务模型，差异在运行时约束与发布链路。",
    contentMarkdown:
      "我会先列端能力（离线、支付、系统 API、包体、审核），再决定同构方案还是混合壳。移动端盯 viewport 与安全区；小程序盯 setData 与分包；桌面盯 Electron / Tauri / Capacitor 的包体与更新链。",
    tags: ["大前端", "小程序", "桌面端", "H5"],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

export function isGhPagesBuild() {
  return process.env.GH_PAGES === "1";
}

export function listStaticNoteSlugs() {
  return staticNotes.map((note) => note.slug);
}
