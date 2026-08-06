export function ConsoleShell({
  children,
  title,
  description,
  actions,
  hideHeader = false,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  hideHeader?: boolean;
}) {
  const showHeader = !hideHeader && (title || description || actions);

  return (
    <main className="flex h-full min-h-0 flex-col px-6 py-6 lg:px-8 lg:py-8">
      {showHeader ? (
        <div className="mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            {title ? (
              <h1 className="text-2xl font-semibold text-white md:text-3xl">
                {title}
              </h1>
            ) : null}
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          hideHeader
            ? "overflow-hidden"
            : "overflow-y-auto [scrollbar-gutter:stable]"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
