export function less<T>(a: T, b: T) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function greater<T>(a: T, b: T) {
  return a === b ? 0 : a > b ? -1 : 1;
}
