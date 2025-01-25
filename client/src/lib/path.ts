export interface ParsedPath {
  collectionId: number;
  filename: string;
}

export class Path {
  static dirname(filename: string): string {
    const lastPathSeparator = filename.lastIndexOf('/');

    return filename.substring(0, lastPathSeparator);
  }

  static basename(filename: string): string {
    const extensionStart = filename.lastIndexOf('.');
    const filenameStart = filename.lastIndexOf('/') + 1;

    return filename.substring(
      filenameStart,
      extensionStart !== -1 ? extensionStart : undefined
    );
  }

  static extension(filename: string): string {
    const extensionStart = filename.lastIndexOf('.');
    return extensionStart !== -1 ? filename.substring(extensionStart) : '';
  }

  static parse(path: string): ParsedPath {
    const startSlash = path.indexOf('/');
    const collectionId = Number.parseInt(path);
    const filename = path.substring(startSlash + 1);

    return { collectionId, filename };
  }

  static fullPath(collectionId: number, path: string): string {
    return path.length ? `${collectionId}/${path}` : collectionId.toString();
  }
}
