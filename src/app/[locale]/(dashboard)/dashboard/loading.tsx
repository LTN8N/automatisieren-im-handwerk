import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Quick actions skeleton */}
      <div className="flex gap-3 overflow-x-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-28 rounded-xl flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}
