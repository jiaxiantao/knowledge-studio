export type ParsedAssistantAnswer = {
  thinking: string;
  conclusion: string;
  /** Still inside thinking tags while streaming */
  phase: "thinking" | "conclusion" | "raw";
};

const THINKING_OPEN = "<thinking>";
const THINKING_CLOSE = "</thinking>";
const CONCLUSION_OPEN = "<conclusion>";
const CONCLUSION_CLOSE = "</conclusion>";

/**
 * Parse model output shaped as:
 * <thinking>...</thinking>
 * <conclusion>...</conclusion>
 *
 * Tolerates partial streams and plain-text fallbacks.
 */
export function parseAssistantAnswer(raw: string): ParsedAssistantAnswer {
  const text = raw.trimStart();

  if (!text) {
    return { thinking: "", conclusion: "", phase: "thinking" };
  }

  const lower = text.toLowerCase();
  const hasThinkingOpen = lower.includes(THINKING_OPEN);
  const hasConclusionOpen = lower.includes(CONCLUSION_OPEN);

  if (!hasThinkingOpen && !hasConclusionOpen) {
    return { thinking: "", conclusion: text.trim(), phase: "raw" };
  }

  const thinkingStart = indexOfIgnoreCase(text, THINKING_OPEN);
  const thinkingEnd = indexOfIgnoreCase(text, THINKING_CLOSE);
  const conclusionStart = indexOfIgnoreCase(text, CONCLUSION_OPEN);
  const conclusionEnd = indexOfIgnoreCase(text, CONCLUSION_CLOSE);

  let thinking = "";
  let conclusion = "";
  let phase: ParsedAssistantAnswer["phase"] = "thinking";

  if (thinkingStart !== -1) {
    const bodyStart = thinkingStart + THINKING_OPEN.length;
    if (thinkingEnd !== -1 && thinkingEnd > bodyStart) {
      thinking = text.slice(bodyStart, thinkingEnd).trim();
      phase = "conclusion";
    } else {
      thinking = text.slice(bodyStart).trim();
      phase = "thinking";
    }
  }

  if (conclusionStart !== -1) {
    const bodyStart = conclusionStart + CONCLUSION_OPEN.length;
    if (conclusionEnd !== -1 && conclusionEnd > bodyStart) {
      conclusion = text.slice(bodyStart, conclusionEnd).trim();
    } else {
      conclusion = text.slice(bodyStart).trim();
    }
    phase = "conclusion";
  } else if (thinkingEnd !== -1) {
    const afterThinking = text.slice(thinkingEnd + THINKING_CLOSE.length).trim();
    if (afterThinking && !afterThinking.toLowerCase().startsWith("<")) {
      conclusion = afterThinking;
      phase = "conclusion";
    }
  }

  return { thinking, conclusion, phase };
}

function indexOfIgnoreCase(haystack: string, needle: string) {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}
