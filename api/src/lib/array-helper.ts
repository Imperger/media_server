import { NonEmptyArray } from './non-empty-array';

type Comparator<T> = (a: T, b: T) => boolean;

export class ArrayHelper {
  /**
   * Finds the greatest element in the non-empty array
   * @param array non-empty array
   * @param comp comparsion function which returns `true`
   * if the first argument is `less` than the second
   * @returns the greatest element
   */
  static max<T>(array: NonEmptyArray<T>, comp: Comparator<T>): T {
    let currentMax = array[0];
    for (let n = 1; n < array.length; ++n) {
      if (comp(currentMax, array[n])) {
        currentMax = array[n];
      }
    }

    return currentMax;
  }
}
