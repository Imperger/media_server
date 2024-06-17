import * as fs from 'fs/promises';
import * as path from 'path';

export class FSHelper {
  static async *EnumerateFiles(folder: string): AsyncGenerator<string> {
    const folders: string[] = [folder];

    while (folders.length > 0) {
      const folder = folders.pop()!;
      const dir = await fs.opendir(folder);

      for await (const entry of dir) {
        if (entry.isDirectory()) {
          folders.push(path.join(folder, entry.name));
        } else {
          yield path.join(folder, entry.name);
        }
      }
    }
  }

  static async exists(filename: string): Promise<boolean> {
    try {
      await fs.access(filename, fs.constants.R_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  static async isDirectory(path: string): Promise<boolean> {
    try {
      return (await fs.stat(path)).isDirectory();
    } catch (e) {
      return false;
    }
  }
}
