import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function TechnikerLoading() {
  return (
    <div className="p-4 sm:p-6">
      <TableSkeleton columns={3} rows={5} />
    </div>
  );
}
