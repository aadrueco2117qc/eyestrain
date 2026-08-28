export default function TrendsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-36 bg-muted rounded" />
        <div className="h-64 w-full bg-muted rounded-lg" />
      </div>
    </div>
  );
}
