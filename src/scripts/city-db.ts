import { cities, type City } from '../data/cities';

export interface SearchResult extends City {
  score: number;
}

/**
 * Perform a fast, client-side fuzzy search on the static city database.
 * Returns results ranked by a match score and population.
 */
export function searchCities(query: string, maxResults = 8): SearchResult[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const results: SearchResult[] = [];

  for (const city of cities) {
    const cityName = city.name.toLowerCase();
    const countryName = city.country.toLowerCase();

    let score = 0;

    // 1. Exact matches (highest priority)
    if (cityName === cleanQuery) {
      score += 1000;
    } else if (cityName.startsWith(cleanQuery)) {
      // 2. Starts with query
      score += 500;
    } else {
      // 3. Word-boundary matches (e.g., "Francisco" in "San Francisco")
      const words = cityName.split(/\s+/);
      const wordMatch = words.some(word => word.startsWith(cleanQuery));
      if (wordMatch) {
        score += 300;
      } else if (cityName.includes(cleanQuery)) {
        // 4. General substring matches
        score += 100;
      }
    }

    // 5. Country matches (lower weight than city name)
    if (countryName === cleanQuery) {
      score += 150;
    } else if (countryName.startsWith(cleanQuery)) {
      score += 80;
    } else if (countryName.includes(cleanQuery)) {
      score += 40;
    }

    // 6. Subsequence or abbreviation match shorthand (e.g., "nyc" for "New York", "sf" for "San Francisco")
    if (cleanQuery.length >= 2) {
      // Check first letter of each word
      const initials = cityName
        .split(/[\s-]+/)
        .map(w => w[0])
        .join('');
      if (initials.startsWith(cleanQuery)) {
        score += 400;
      }
    }

    if (score > 0) {
      results.push({ ...city, score });
    }
  }

  // Sort by score (descending), then by population (descending)
  return results
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.population - a.population;
    })
    .slice(0, maxResults);
}
