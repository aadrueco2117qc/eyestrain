import { Eye } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Eye className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
