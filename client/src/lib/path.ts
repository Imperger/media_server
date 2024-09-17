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
}