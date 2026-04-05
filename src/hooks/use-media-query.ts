"use client";

import { useEffect, useState } from "react";

/**
 * Viewport media query for client components.
 *
 * Always starts as `false` on server and on the first client render, then
 * updates after mount from `matchMedia`. This matches SSR output and avoids
 * hydration mismatches (unlike useSyncExternalStore with getServerSnapshot
 * `false` while the client snapshot reads `true` on desktop immediately).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
