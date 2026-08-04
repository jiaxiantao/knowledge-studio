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

  if (labels.has("architecture") || labels.has("performance")) {
    links.push({ href: "/notes", label: "笔记库检索" });
  }
  if (labels.has("workflow") || labels.has("implementation")) {
    links.push({ href: "/assistant", label: "继续对话" });
  }
  if (labels.has("debug")) {
    links.push({ href: "/api/health", label: "服务健康检查" });
  }

  links.push({ href: "/notes", label: "笔记库" });

  const seen = new Set<string>();
  return links
    .filter((link) => {
      if (seen.has(link.href)) {
        return false;
      }
      seen.add(link.href);
      return true;
    })
    .slice(0, 5);
}
