export interface ParsedFilename {
  collectionId: number;
  path: string;
}

export function parseFilename(filename: string): ParsedFilename {
  const filenameArray = filename.split('');
  const startSlash = filenameArray.indexOf('/');
  const endSlash = filenameArray.lastIndexOf('/');

  const collectionId = Number.parseInt(filename);
  const path = filename.substring(startSlash + 1, endSlash);

  return { collectionId, path };
}
