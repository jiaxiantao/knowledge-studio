import { AnimatedContent } from "@/components/reactbits/animated-content";
import { BlurText } from "@/components/reactbits/blur-text";
import { GradientText } from "@/components/reactbits/gradient-text";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <AnimatedContent
      distance={20}
      className={cn(
        "max-w-3xl rounded-3xl border border-white/8 bg-white/3 px-5 py-4 shadow-[0_10px_40px_rgba(2,6,23,0.18)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em]">
          <GradientText
            animationSpeed={10}
            colors={["#67e8f9", "#93c5fd", "#c4b5fd"]}
            className="text-cyan-200/90"
          >
            {eyebrow}
          </GradientText>
        </p>
        <span className="h-px flex-1 bg-linear-to-r from-cyan-300/45 via-violet-300/25 to-transparent" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
        <BlurText text={title} animateBy="words" direction="bottom" />
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">{description}</p>
      ) : null}
    </AnimatedContent>
  );
}
