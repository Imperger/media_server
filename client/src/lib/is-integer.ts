export function isInteger(str: string): boolean {
  if (str.length === 0) return false;

  for (const x of str) {
    if (x < '0' || x > '9') {
      return false;
    }
  }

  return true;
}
