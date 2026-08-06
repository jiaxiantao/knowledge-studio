"use client";

type SuggestedQuestionsProps = {
  questions: string[];
  disabled?: boolean;
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({
  questions,
  disabled = false,
  onSelect,
}: SuggestedQuestionsProps) {
  if (!questions.length) {
    return null;
  }

  return (
    <div className="mb-2 flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[11px] text-slate-500">推荐追问</span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:thin]">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            title={question}
            className="max-w-[14rem] shrink-0 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-left text-[11px] leading-4 text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
