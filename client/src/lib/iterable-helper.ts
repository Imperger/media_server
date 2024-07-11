export class IterableHelper {
  static countIf<T>(target: Iterable<T>, pred: (value: T) => boolean): number {
    let count = 0;

    for (const value of target) {
      count += +pred(value);
    }

    return count;
  }
}
