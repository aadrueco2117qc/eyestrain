export default function RiskPredictionLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-52 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="h-5 w-44 bg-muted rounded" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-48 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
