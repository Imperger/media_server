export interface ParsedFilename {
  collectionId: number;
  path: string;
}

export function parseFilename(filename: string): ParsedFilename {
  const startSlash = filename.indexOf('/');
  const endSlash = filename.lastIndexOf('/');

  const collectionId = Number.parseInt(filename);
  const path = filename.substring(startSlash + 1, endSlash);

  return { collectionId, path };
}
