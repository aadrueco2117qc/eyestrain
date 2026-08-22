export default function DailyLogLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="h-4 w-96 bg-muted rounded" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        ))}
        <div className="h-12 w-full bg-muted rounded-xl mt-4" />
      </div>
    </div>
  );
}
