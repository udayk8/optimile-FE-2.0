import { useLocation } from "react-router-dom";

const EMBEDDED_BASE_PATTERN = /^(.*\/auction-ams)(\/|$)/;
const STANDALONE_BASE = "/auction";

/**
 * Resolves the active Auction base path.
 *
 * - Standalone app (host mounts `/auction/*`): returns "/auction".
 * - Embedded in platform-admin tenant shell (path contains "/auction-ams"):
 *   returns the matched prefix, e.g.
 *   "/platform-admin/tenant/tenant-nippon01/auction-ams".
 *
 * Use this for any internal Auction navigation so links don't jump out
 * of whichever shell currently hosts the auction pages.
 */
export function useAuctionBasePath(): string {
  const { pathname } = useLocation();
  const match = pathname.match(EMBEDDED_BASE_PATTERN);
  return match ? match[1] : STANDALONE_BASE;
}

/**
 * Returns a `path(suffix)` builder pinned to the active base. The suffix
 * is the part *after* the auction base — pass either "/auctions/123" or
 * "auctions/123"; both resolve to the same final URL.
 */
export function useAuctionPath(): (suffix: string) => string {
  const base = useAuctionBasePath();
  return (suffix: string) => {
    if (!suffix) return base;
    const normalised = suffix.startsWith("/") ? suffix : `/${suffix}`;
    return `${base}${normalised}`;
  };
}
