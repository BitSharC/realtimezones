export const PLANNER_QUERY_PARAMS = [
  'cities',
  'focus',
  'date',
  'duration',
  'format'
] as const;

export type PlannerQueryParam = typeof PLANNER_QUERY_PARAMS[number];

/**
 * Checks if a given query string, URL, or URLSearchParams contains any recognized planner query parameter.
 */
export function hasPlannerParams(searchOrUrl: string | URLSearchParams): boolean {
  if (!searchOrUrl) return false;

  if (typeof searchOrUrl !== 'string') {
    return PLANNER_QUERY_PARAMS.some(param => searchOrUrl.has(param));
  }

  const queryIndex = searchOrUrl.indexOf('?');
  const search = queryIndex !== -1 ? searchOrUrl.slice(queryIndex + 1) : (searchOrUrl.startsWith('?') ? searchOrUrl.slice(1) : '');
  if (!search) return false;

  const params = new URLSearchParams(search);
  return PLANNER_QUERY_PARAMS.some(param => params.has(param));
}

/**
 * Rewrites a URL or path to use the /planner pathname while preserving
 * the exact query string literally, preserving encoding, special characters,
 * and unknown query parameters.
 */
export function buildPlannerUrl(rawUrlOrPath: string): string {
  if (!rawUrlOrPath) return '/planner';

  const isFullUrl = /^https?:\/\//i.test(rawUrlOrPath);
  if (isFullUrl) {
    try {
      const url = new URL(rawUrlOrPath);
      const origin = url.origin;
      const search = url.search;
      const hash = url.hash;
      return `${origin}/planner${search}${hash}`;
    } catch {
      // Fall through to relative handling
    }
  }

  const queryIndex = rawUrlOrPath.indexOf('?');
  const hashIndex = rawUrlOrPath.indexOf('#');

  let search = '';
  let hash = '';

  if (queryIndex !== -1) {
    if (hashIndex !== -1 && hashIndex > queryIndex) {
      search = rawUrlOrPath.slice(queryIndex, hashIndex);
      hash = rawUrlOrPath.slice(hashIndex);
    } else {
      search = rawUrlOrPath.slice(queryIndex);
    }
  } else if (hashIndex !== -1) {
    hash = rawUrlOrPath.slice(hashIndex);
  }

  return `/planner${search}${hash}`;
}

/**
 * Determines whether a compatibility redirect from root to /planner is needed.
 * Returns the destination /planner URL string if redirect is appropriate, or null if not.
 */
export function getPlannerCompatibilityRedirect(
  pathname: string,
  search: string
): string | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath !== '/') {
    return null;
  }

  if (!hasPlannerParams(search)) {
    return null;
  }

  const cleanSearch = search.startsWith('?') ? search : (search ? `?${search}` : '');
  return `/planner${cleanSearch}`;
}
