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
    <div className="mb-3">
      <p className="mb-2 text-[11px] tracking-wide text-slate-500">推荐追问</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
