import type { IntentLabel } from "@/lib/front-intelligence";

export type AssistantContextLink = {
  href: string;
  label: string;
};

export function buildAssistantContextLinks(
  intents: Array<{ label: IntentLabel; score: number }>,
): AssistantContextLink[] {
  const labels = new Set(intents.map((item) => item.label));
  const links: AssistantContextLink[] = [];

  if (labels.has("architecture")) {
    links.push({ href: "/notes", label: "架构相关笔记" });
  }
  if (labels.has("performance")) {
    links.push({ href: "/notes", label: "性能相关笔记" });
  }
  if (labels.has("workflow")) {
    links.push({ href: "/notes", label: "工作流相关笔记" });
  }
  if (labels.has("debug")) {
    links.push({ href: "/api/health", label: "运行时健康检查" });
  }
  if (labels.has("implementation")) {
    links.push({ href: "/assistant", label: "继续追问 Assistant" });
  }

  links.push({ href: "/notes", label: "笔记库检索" });

  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) {
      return false;
    }
    seen.add(link.href);
    return true;
  }).slice(0, 5);
}
