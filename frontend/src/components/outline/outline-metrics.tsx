type Props = {
  title: string;
  subtitle?: string;
  totalWords: number;
  estPages: number;
};

export function OutlineMetrics({
  title,
  subtitle,
  totalWords,
  estPages,
}: Props) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-slate-500 dark:text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs uppercase text-slate-500 dark:text-muted-foreground">
            Total words
          </p>
          <p className="text-lg font-medium text-slate-900 dark:text-foreground">
            {totalWords.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500 dark:text-muted-foreground">
            Est. pages
          </p>
          <p className="text-lg font-medium text-slate-900 dark:text-foreground">
            {estPages}
          </p>
        </div>
      </div>
    </header>
  );
}
