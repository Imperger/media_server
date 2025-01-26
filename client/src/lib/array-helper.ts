export type Comparator<T> = (a: T, b: T) => boolean;

export class ArrayHelper {
  /**
   * Returns array without a first element that satisfies the predicate
   * @param target array
   * @param pred predicate
   * @returns array without one element that satisfies predicate
   */
  static discardFirst<T>(
    target: T[],
    pred: (value: T, idx: number, target: T[]) => boolean
  ): T[] {
    const discarded = target.findIndex((x, idx, arr) => pred(x, idx, arr));

    if (discarded === -1) {
      return target;
    }

    return [...target.slice(0, discarded), ...target.slice(discarded + 1)];
  }

  static mergeWithFiltered<TOrigin, TFiltered>(
    origin: TOrigin[],
    filtered: TFiltered[],
    cmp: (origin: TOrigin, filtered: TFiltered) => boolean
  ): TOrigin[] {
    let originIdx = 0;
    return filtered.map((f) => {
      while (originIdx < origin.length) {
        if (cmp(origin[originIdx], f)) {
          break;
        }

        ++originIdx;
      }

      return origin[originIdx];
    });
  }

  static quickSort<T>(arr: T[], cmp: Comparator<T>, low: number, high: number) {
    if (low >= high) return;
    const pi = ArrayHelper.partition(arr, cmp, low, high);

    ArrayHelper.quickSort(arr, cmp, low, pi - 1);
    ArrayHelper.quickSort(arr, cmp, pi + 1, high);
  }

  /**
   * Merge sorted arrays to single
   * @param array
   */
  static mergeArrays<T>(array: T[][], cmp: Comparator<T>): T[] {
    const result: T[] = [];
    const arrayIdx = Array.from({ length: array.length }, () => 0);

    for (let unprocessedArrays = arrayIdx.length; unprocessedArrays > 0; ) {
      let minIdx = arrayIdx.findIndex((x, n) => x < array[n].length);
      for (let n = minIdx + 1; n < arrayIdx.length; ++n) {
        if (
          arrayIdx[n] < array[n].length &&
          cmp(array[n][arrayIdx[n]], array[minIdx][arrayIdx[minIdx]])
        ) {
          minIdx = n;
        }
      }

      result.push(array[minIdx][arrayIdx[minIdx]++]);

      if (arrayIdx[minIdx] === array[minIdx].length) {
        --unprocessedArrays;
      }
    }

    return result;
  }

  private static partition<T>(
    arr: T[],
    cmp: Comparator<T>,
    low: number,
    high: number
  ) {
    const pivot = arr[high];
    let i = low - 1;

    for (let j = low; j <= high - 1; j++) {
      if (cmp(arr[j], pivot)) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];

    return i + 1;
  }
}
