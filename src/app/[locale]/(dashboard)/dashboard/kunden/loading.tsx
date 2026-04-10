import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function KundenLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <TableSkeleton columns={6} rows={8} />
    </div>
  );
}
