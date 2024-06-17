export class ArrayHelper {
  /**
   * The result of the work is the input array but without
   * the first element on which the predicate returned a false
   * @param target array
   * @param pred predicate
   */
  static filterFirst<T>(
    target: T[],
    pred: (value: T, idx: number, target: T[]) => boolean
  ): T[] {
    const discarded = target.findIndex((x, idx, arr) => !pred(x, idx, arr));

    if (discarded === -1) {
      return target;
    }

    return [...target.slice(0, discarded), ...target.slice(discarded + 1)];
  }
}
