import { Skeleton } from "@/components/ui/skeleton";

export function FlightListSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="hidden lg:block">
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
