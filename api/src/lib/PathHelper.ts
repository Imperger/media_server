import * as Path from 'path';

export interface ParsedContentFilename {
  collectionId: number;
  path: string;
}

export class PathHelper {
  static isSubdirectory(parent: string, subdirectory: string): boolean {
    const relativePath = Path.relative(parent, subdirectory);

    return relativePath.length > 0 && !relativePath.startsWith('..' + Path.sep);
  }

  static IsPathsOverlap(a: string, b: string): boolean {
    const parsed = Path.parse(Path.relative(a, b));

    return !(parsed.dir.startsWith('..') && parsed.base !== '..');
  }

  static get mediaEntry(): string {
    return Path.join(process.cwd(), 'media');
  }

  static get configEntry(): string {
    return Path.join(Path.join(this.mediaEntry, '.config'));
  }

  // TODO Use configEntry()
  static get assetsEntry(): string {
    return Path.join(PathHelper.mediaEntry, '.config', 'assets');
  }

  static get previewEntry(): string {
    return Path.join(this.assetsEntry, 'preview');
  }

  static get trailerEntry(): string {
    return Path.join(this.assetsEntry, 'trailer');
  }

  static get scrubbingEntry(): string {
    return Path.join(this.assetsEntry, 'scrubbing');
  }

  static relativeToMedia(absolutePath: string): string {
    return Path.relative(PathHelper.mediaEntry, absolutePath);
  }

  static fileDepth(relativePath: string): number {
    return relativePath.split(Path.sep).length - 1;
  }

  static folderDepth(relativePath: string): number {
    return relativePath.length > 0 ? relativePath.split(Path.sep).length : 0;
  }

  static parents(collectionRoot: string, relativePath: string): string[] {
    if (
      collectionRoot.length > relativePath.length ||
      !PathHelper.isSubdirectory(collectionRoot, relativePath)
    ) {
      return [];
    }

    const relativeToCollectionRoot = Path.relative(
      collectionRoot,
      relativePath
    );
    const basename = Path.basename(collectionRoot);

    const folders = `${basename}${Path.sep}${relativeToCollectionRoot}`
      .split(Path.sep)
      .slice(0, -1);

    let prefix = '';
    return folders.map((x) => {
      const res = prefix + x;

      if (x.length > 0) {
        prefix += x + Path.sep;
      }

      return res;
    });
  }

  static isFileInFolder(filename: string, folder: string): boolean {
    return Path.parse(filename).dir === folder;
  }

  static fileFolder(filename: string): string {
    return Path.parse(filename).dir;
  }

  static dirname(path: string): string {
    const dirname = Path.dirname(path);
    return dirname === '.' ? '' : dirname;
  }

  /**
   * Parse a content url that usually comes from frontend
   * @param filename Filename in format {collectionId}/{filename}
   * @returns collection id and relative to it path or null
   */
  static parseContentFilename(filename: string): ParsedContentFilename | null {
    const propsSplitIdx = filename.indexOf('/');

    if (propsSplitIdx === -1 || propsSplitIdx === filename.length - 1) {
      return null;
    }

    const collectionId = Number.parseInt(
      filename.substring(0, propsSplitIdx),
      10
    );

    if (Number.isNaN(collectionId)) {
      return null;
    }

    return { collectionId, path: filename.substring(propsSplitIdx + 1) };
  }
}
