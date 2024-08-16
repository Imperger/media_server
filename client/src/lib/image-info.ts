export interface ImageInfo {
  width: number;
  height: number;
}

export async function imageInfo(url: string): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.addEventListener(
      'load',
      () => resolve({ width: img.naturalWidth, height: img.naturalHeight }),
      { once: true }
    );

    img.addEventListener(
      'error',
      () => reject(new Error('Failed to load image')),
      { once: true }
    );

    img.src = url;
  });
}
