export type DotTree = { [key: string]: DotTree | string };

export type KeyExtractor<T> = (x: T) => string;

export type payloadExtractor<T, P> = (x: T) => P;

export function dotArrayToTree<T>(
  array: T[],
  keyExtractor: KeyExtractor<T>
): DotTree {
  const tree: DotTree = {};

  for (const dotString of array) {
    let current = tree;

    const path = keyExtractor(dotString).split('.');

    for (let n = 0; n < path.length - 1; ++n) {
      if (typeof current[path[n]] === 'object') {
        current = current[path[n]] as DotTree;
      } else if (current[path[n]] === '') {
        throw new Error(
          `Trying to add a node that already defined as leaf while processing '${dotString}'`
        );
      } else {
        const obj = {};
        current[path[n]] = obj;
        current = obj;
      }
    }

    if (typeof current[path[path.length - 1]] === 'object') {
      throw new Error(
        `Trying to add a leaf that is already defined as node while processing '${dotString}'`
      );
    }

    current[path[path.length - 1]] = '';
  }

  return tree;
}
