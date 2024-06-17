import * as path from 'path';

export class PathHelper {
  static isSubdirectory(parent: string, subdirectory: string): boolean {
    const relativePath = path.relative(parent, subdirectory);

    return relativePath.length > 0 && !relativePath.startsWith('..' + path.sep);
  }

  static IsPathsOverlap(a: string, b: string): boolean {
    const parsed = path.parse(path.relative(a, b));

    return !(parsed.dir.startsWith('..') && parsed.base !== '..');
  }

  static get mediaEntry(): string {
    return path.join(process.cwd(), 'media');
  }

  static get configEntry(): string {
    return path.join(path.join(this.mediaEntry, '.config'));
  }

  // TODO Use configEntry()
  static get assetsEntry(): string {
    return path.join(PathHelper.mediaEntry, '.config', 'assets');
  }

  static get previewEntry(): string {
    return path.join(this.assetsEntry, 'preview');
  }

  static get trailerEntry(): string {
    return path.join(this.assetsEntry, 'trailer');
  }

  static relativeToMedia(absolutePath: string): string {
    return path.relative(PathHelper.mediaEntry, absolutePath);
  }

  static fileDepth(relativePath: string): number {
    return relativePath.split(path.sep).length - 1;
  }
}
