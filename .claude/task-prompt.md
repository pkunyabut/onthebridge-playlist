You are working on the OnTheBridge Playlist Next.js app at C:\Users\pkuny\onthebridge-playlist\. The project uses Next.js 14, Tailwind CSS, and already has TMDb integration for search.

## Task: Build a JustWatch-style landing page

### Current state:
- `app/page.tsx` — basic landing page with features grid
- `app/api/tmdb/route.ts` — TMDb search API (requires auth session)
- `lib/tmdb.ts` — TMDb utility functions and types
- `lib/types.ts` — shared types (MediaType, PlatformType, etc.)
- `components/MediaCard.tsx` — existing card component with poster, rating, provider badges, save button
- `components/CardSkeleton.tsx` — skeleton loading component
- `middleware.ts` — protects /dashboard, /search, /watchlist (redirects to /login if no session)

### Requirements:

1. **Extend `lib/tmdb.ts`** — add a `TmdbPopularResponse` interface and a `fetchPopularTmdb` function that calls TMDb `/movie/popular`, `/tv/popular`, `/movie/top_rated`, and `/tv/top_rated` endpoints. Map results to the existing `TmdbResult` shape (id, title, year, poster, rating, type, providers). For popular endpoints, providers won't be included in the initial response — that is OK, leave providers empty for popular items.

2. **Create `app/api/tmdb/popular/route.ts`** — a new public API endpoint (NO auth required — this is for the landing page) that accepts query params `type` (movie|tv, default movie), `category` (popular|top_rated, default popular), and `page` (default 1). Call the TMDb API and return the mapped results in the same `TmdbSearchResponse` shape.

3. **Rebuild `app/page.tsx`** as a JustWatch-style browse page:
   - **Hero section** at top with gradient background, tagline, and CTA buttons (keep existing login flow for non-logged-in users)
   - **Tabs** to switch between "Movies" and "TV Shows"
   - **Sub-tabs or filter** for "Popular" vs "Top Rated"
   - **Grid of cards** using the existing `MediaCard` component, showing poster, title, year, rating (star), provider badges
   - **Pagination** or "Load more" button at the bottom (load more is simpler — fetch next page and append)
   - Each card should have a save-to-watchlist button (already in MediaCard) and clicking the card should link to `/search?q=<title>`
   - Responsive grid: 2 cols on mobile, 3 on sm, 4 on lg, 5 on xl
   - Dark mode support (already has dark: classes throughout)
   - Skeleton loading state (use existing `CardSkeleton` component)

4. **Keep the existing auth flow** — the login button in the header should remain for non-logged-in users. The popular/browse content is public.

### Important notes:
- TMDb API base: `https://api.themoviedb.org/3`, image base: `https://image.tmdb.org/t/p/w500`
- TMDb API key is in `process.env.TMDB_API_KEY`
- Keep all existing code working — the search API endpoint should not break
- Do NOT modify articles, images, or audio files
- Do NOT add any new npm dependencies
- The `MediaCard` component expects `result: TmdbResult`, `saved: boolean`, `saving: boolean`, `onToggleSave: (result: TmdbResult) => void`
- The `CardSkeleton` component exists at `components/CardSkeleton.tsx`
- For the watchlist save functionality, check if there is an existing API endpoint. If not, create a simple one at `app/api/watchlist/route.ts` that accepts POST with `{ tmdbId, title, poster, rating, type }` and stores it. Use Supabase (the project already has `@supabase/supabase-js` configured). Check `lib/supabase.ts` for the Supabase client setup.
- The landing page should be a client component (use `'use client'`) since it needs to fetch data and manage state.

### File structure to create/modify:
- `lib/tmdb.ts` — add popular fetch function
- `app/api/tmdb/popular/route.ts` — new public API endpoint
- `app/api/watchlist/route.ts` — new API endpoint for saving/removing watchlist items (check existing patterns first)
- `app/page.tsx` — complete rewrite as JustWatch-style browse page

Please implement all of this. Make sure the code compiles and the dev server starts without errors. Run `npm run build` at the end to verify there are no build errors.
