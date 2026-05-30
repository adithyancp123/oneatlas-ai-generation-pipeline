/** Deterministic closest-string helper for consistency repairs. */

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

export function closestStringMatch(
  target: string,
  candidates: readonly string[],
  maxDistance = 4,
): string | null {
  if (candidates.length === 0) return null;

  const normalized = target.trim().toLowerCase();
  const exact = candidates.find((c) => c.toLowerCase() === normalized);
  if (exact) return exact;

  const substring = candidates.find(
    (c) =>
      normalized.includes(c.toLowerCase()) || c.toLowerCase().includes(normalized),
  );
  if (substring) return substring;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = levenshtein(normalized, candidate.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return bestDistance <= maxDistance ? best : null;
}
