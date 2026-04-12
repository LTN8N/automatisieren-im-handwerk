import { Skeleton } from "@/components/ui/skeleton";

export default function JahresplanLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Zurück-Button */}
      <Skeleton className="h-9 w-24 rounded-xl" />

      {/* Status-Banner */}
      <Skeleton className="h-14 w-full rounded-2xl" />

      {/* Mobile: Monatsliste Skeleton */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Kalender + Sidebar Skeleton */}
      <div className="hidden md:flex gap-4">
        <Skeleton className="flex-1 min-h-[500px] rounded-xl" />
        <div className="w-64 shrink-0 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
