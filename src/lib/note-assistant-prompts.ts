type NoteLike = { title: string; tags?: string[] };

export function buildNoteAssistantPrompts(notes: NoteLike[]): string[] {
  const tagCounts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const prompts = [
    "结合笔记库，总结我在前端架构治理上的三条可执行建议",
    "从笔记里检索性能优化相关内容，并给出 p95 验收指标",
    "根据笔记内容，列一份发布前质量门禁检查清单",
  ];

  if (topTags[0]) {
    prompts.unshift(`检索标签「${topTags[0]}」相关笔记，输出步骤清单与风险点`);
  }

  const featured = notes[0];
  if (featured?.title) {
    prompts.push(`围绕笔记「${featured.title}」追问：如何落地到当前项目？`);
  }

  return [...new Set(prompts)].slice(0, 5);
}
