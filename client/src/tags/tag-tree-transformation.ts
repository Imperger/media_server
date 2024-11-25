import { TagTree } from '@/lib/components/tag-tree/tag-tree';

export function mergeWithTagTree(dotString: string, tree: TagTree): TagTree {
  let current = tree;
  const path = dotString.split('.');

  for (let n = 0; n < path.length - 1; ++n) {
    if (typeof current[path[n]] === 'object') {
      current = current[path[n]] as TagTree;
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

  return tree;
}

export function unmergeWithTagTree(dotString: string, tree: TagTree): TagTree {
  const layouts = [tree];
  const path = dotString.split('.');

  for (let n = 0; n < path.length - 1; ++n) {
    const nextLayout = layouts[layouts.length - 1][path[n]];

    if (typeof nextLayout === 'string' || nextLayout === undefined) {
      return tree;
    }

    layouts.push(nextLayout as TagTree);
  }

  if (typeof layouts[layouts.length - 1][path[path.length - 1]] === 'string') {
    delete layouts[layouts.length - 1][path[path.length - 1]];
    layouts.pop();
  } else {
    return tree;
  }

  for (
    let n = path.length - 2;
    layouts.length > 0 &&
    [...Object.keys(layouts[layouts.length - 1][path[n]])].length === 0;
    --n
  ) {
    delete layouts[layouts.length - 1][path[n]];
    layouts.pop();
  }

  return tree;
}
