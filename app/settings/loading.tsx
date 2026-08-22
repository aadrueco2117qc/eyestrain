export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-3xl animate-pulse">
      <div className="h-8 w-32 bg-muted rounded-lg" />
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(j => (
              <div key={j} className="space-y-2">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
