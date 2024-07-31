import { useEffect, useState } from 'react';

import { DownloadManager } from './download-manager';

import { Inversify } from '@/inversify';

const downloadManager = Inversify.get(DownloadManager);

export function useDownloadProgress(mediaUrl: string) {
  const [progress, setProgress] = useState(0);

  useEffect(
    () => downloadManager.subscribe(mediaUrl, (x) => setProgress(x)),
    []
  );

  return progress;
}
