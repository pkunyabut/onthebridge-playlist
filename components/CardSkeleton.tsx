export default function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-pulse">
      <div className="aspect-[2/3] bg-gray-200 dark:bg-slate-700" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-4/5" />
        <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
      </div>
    </div>
  );
}
