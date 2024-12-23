export interface Weights {
  substitution: number;
  deletion: number;
  insertion: number;
  transposition: number;
}

export function weightedDamerauLevenshtein(
  a: string,
  b: string,
  weights: Weights
) {
  const { substitution, deletion, insertion, transposition } = weights;

  const len1 = a.length;
  const len2 = b.length;
  const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i * deletion;
  for (let j = 0; j <= len2; j++) dp[0][j] = j * insertion;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : substitution;

      dp[i][j] = Math.min(
        dp[i - 1][j] + deletion,
        dp[i][j - 1] + insertion,
        dp[i - 1][j - 1] + cost
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + transposition);
      }
    }
  }

  return dp[len1][len2];
}
