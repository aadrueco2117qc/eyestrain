export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-72 bg-muted rounded-lg" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Analytics panels skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="h-5 w-32 bg-muted rounded" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-4 w-full bg-muted rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
