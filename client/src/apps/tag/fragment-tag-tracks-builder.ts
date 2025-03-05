import { ArrayHelper } from '@/lib/array-helper';
import { MaxClique } from '@/lib/max-clique';

export interface Tag {
  name: string;
  begin: number;
  end: number;
}

interface DecopuledTag extends Tag {
  label: string;
  category: string;
}

export type TagStripe<T extends Tag> = T[];

export class FragmentTagTracksBuilder {
  /**
   * Builds tag stripes, combine tags from same subcategory to the same stripe,
   * and trying to minimize count of total stripes by combining tag in non intersection maner.
   * Longer stripes first.
   * @param tags
   * @returns
   */
  static build<T extends Tag>(tags: T[]): TagStripe<T>[] {
    if (tags.length === 0) {
      return [];
    }

    const byCategory = new Map<string, DecopuledTag[]>();

    tags.forEach((x) => {
      const nameSep = x.name.lastIndexOf('.');
      const decoupled = {
        category: x.name.substring(0, nameSep),
        label: x.name.substring(nameSep + 1),
        ...x
      };

      const category = byCategory.get(decoupled.category);

      if (category === undefined) {
        byCategory.set(decoupled.category, [decoupled]);
      } else {
        category.push(decoupled);
      }
    });

    for (const tags of byCategory.values()) {
      tags.sort((a, b) => a.begin - b.begin);
    }

    if (byCategory.size === 1) {
      return [...byCategory.values()].map((x) =>
        x.map(({ label: _0, category: _1, ...data }) => data as T)
      );
    }

    const categories = [...byCategory.keys()];
    const categoryMergeMatrix: boolean[][] = Array.from(
      { length: categories.length },
      () => Array.from({ length: categories.length }, () => true)
    );

    for (let n = 0; n < categories.length; ++n) {
      for (let m = n + 1; m < categories.length; ++m) {
        const categoryN = byCategory.get(categories[n])!;
        const categoryM = byCategory.get(categories[m])!;

        let categoryNIdx = 0,
          categoryMIdx = 0;

        while (
          categoryNIdx < categoryN.length &&
          categoryMIdx < categoryM.length
        ) {
          const tagN = categoryN[categoryNIdx];
          const tagM = categoryM[categoryMIdx];

          if (FragmentTagTracksBuilder.tagIntersection(tagN, tagM)) {
            const categoryNIntersectionIdx = categories.indexOf(categories[n]);
            const categoryMIntersectionIdx = categories.indexOf(categories[m]);

            categoryMergeMatrix[categoryNIntersectionIdx][
              categoryMIntersectionIdx
            ] = false;
            categoryMergeMatrix[categoryMIntersectionIdx][
              categoryNIntersectionIdx
            ] = false;

            break;
          }

          if (tagN.begin < tagM.begin) {
            ++categoryNIdx;
          } else {
            ++categoryMIdx;
          }
        }
      }
    }

    const mergedCategories: number[][] = [];
    const adjacencyMatrix: boolean[][] = categoryMergeMatrix;

    let processedIndicesSum = 0;
    let verticesLeft = adjacencyMatrix.length;
    while (verticesLeft > 1) {
      const clique = new MaxClique(adjacencyMatrix).mcqDyn();
      processedIndicesSum += clique.reduce((sum, x) => sum + x, 0);

      mergedCategories.push(clique);

      FragmentTagTracksBuilder.unlinkVertices(adjacencyMatrix, clique);

      verticesLeft -= clique.length;

      if (clique.length === 1) {
        break;
      }
    }

    if (verticesLeft === 1) {
      const max = adjacencyMatrix.length - 1;
      mergedCategories.push([(max * (max + 1)) / 2 - processedIndicesSum]);
    } else {
      const singleCliques = new Set(
        Array.from({ length: adjacencyMatrix.length }, (_, n) => n)
      );
      mergedCategories
        .flatMap((x) => x)
        .forEach((x) => singleCliques.delete(x));
      singleCliques.forEach((x) => mergedCategories.push([x]));
    }

    return mergedCategories.map((mergedIds) =>
      ArrayHelper.mergeArrays(
        mergedIds.map((x) =>
          byCategory
            .get(categories[x])!
            .map(({ label: _0, category: _1, ...data }) => data as T)
        ),
        (a, b) => a.begin < b.begin
      )
    );
  }

  static tagIntersection(a: Tag, b: Tag): boolean {
    return a.begin < b.end && b.begin < a.end;
  }

  private static unlinkVertices(
    adjacencyMatrix: boolean[][],
    excludeList: number[]
  ) {
    for (const vertice of excludeList) {
      for (let n = 0; n < adjacencyMatrix.length; ++n) {
        adjacencyMatrix[vertice][n] = false;
        adjacencyMatrix[n][vertice] = false;
      }
    }
  }
}
