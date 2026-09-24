'use client';

export default function CardSkeleton() {
  return (
    <div className="imdb-card pointer-events-none">
      <div className="poster-container shimmer" />
      <div className="card-info">
        <div className="h-3.5 bg-white/10 rounded w-3/4 mb-2 shimmer" />
        <div className="h-3 bg-white/5 rounded w-1/2 shimmer" />
      </div>
    </div>
  );
}
