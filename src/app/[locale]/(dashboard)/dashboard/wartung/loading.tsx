import { Skeleton } from "@/components/ui/skeleton";

export default function WartungLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Schnellaktionen */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-3">
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      {/* Jahrespläne */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
