import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function ObjekteLoading() {
  return (
    <div className="p-4 sm:p-6">
      <TableSkeleton columns={5} rows={6} />
    </div>
  );
}
