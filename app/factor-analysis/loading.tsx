export default function FactorAnalysisLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-52 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-72 w-full bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
