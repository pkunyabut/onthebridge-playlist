export default function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-cinema-border animate-pulse bg-cinema-card">
      <div className="aspect-[2/3] bg-cinema-800 shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-cinema-700 rounded w-4/5 shimmer" />
        <div className="h-2.5 bg-cinema-700 rounded w-1/3 shimmer" />
      </div>
    </div>
  );
}
