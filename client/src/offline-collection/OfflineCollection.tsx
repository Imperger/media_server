import prettyBytes from 'pretty-bytes';
import { useEffect, useMemo, useState } from 'react';

import { useApiService } from '../api-service/api-context';
import { FileRecord } from '../api-service/api-service';
import FileCard from '../collection/FileCard';
import { useTitle } from '../layout/TitleContext';
import { ArrayHelper } from '../lib/ArrayHelper';
import ContentList from '../lib/components/content-list/ContentList';
import { ContentCache } from '../lib/content-cache';
import { AsyncExceptionTrap } from '../lib/exception-trap';
import { parseFilename } from '../lib/parse-filename';

function OfflineCollection() {
  const baseURL = import.meta.env.BASE_URL;
  const api = useApiService();
  const { setTitle } = useTitle();
  const [savedContent, setSavedContent] = useState<FileRecord[]>([]);

  const updateTitle = async () =>
    setTitle(`Saved (${prettyBytes(await ContentCache.contentSize())})`);

  useEffect(() => {
    setTitle('Saved');
    updateTitle();
  }, []);

  useEffect(() => {
    updateTitle();
  }, [savedContent]);

  useEffect(() => {
    const loadSavedContent = async () => {
      const cachedFiles = await ContentCache.filterContent(() => true);

      setSavedContent(
        await Promise.all(
          cachedFiles.map(async (filename) => {
            const { collectionId, path } = parseFilename(filename);

            const response = await AsyncExceptionTrap.Try(() =>
              api.listFolderCollectionContent(collectionId, path)
            ).CatchValue([]);

            const found = response.find((x) => {
              return x.type === 'file' && x.filename === filename;
            });

            return found
              ? (found as FileRecord)
              : {
                  type: 'file',
                  filename,
                  assetPrefix: 'default_preview',
                  createdAt: 0,
                  duration: 0,
                  width: 0,
                  height: 0,
                  size: 0
                };
          })
        )
      );
    };
    loadSavedContent();
  }, []);

  const sortedContent = useMemo(
    () =>
      savedContent.sort((a, b) => {
        const aKey = a.filename.toLowerCase();
        const bKey = b.filename.toLowerCase();

        return aKey === bKey ? 0 : aKey < bKey ? -1 : 1;
      }),
    [savedContent]
  );

  const onCache = async (filename: string, action: 'cache' | 'evict') => {
    if (action === 'evict') {
      setSavedContent(
        ArrayHelper.filterFirst(savedContent, (x) => x.filename !== filename)
      );
    }
  };

  function filePreview(assetPrefix: string): string {
    return assetPrefix === 'default_preview'
      ? `${baseURL}img/default_preview.webp`
      : `${baseURL}api/file/preview/${assetPrefix}.jpg`;
  }

  return (
    <ContentList>
      {sortedContent.map((x) => {
        return (
          <FileCard
            key={x.filename}
            filename={x.filename}
            size={x.size}
            duration={x.duration}
            width={x.width}
            height={x.height}
            preview={filePreview(x.assetPrefix)}
            createdAt={x.createdAt}
            onDelete={() => 0}
            onCache={onCache}
            isAvailable={true}
            isCached={true}
          />
        );
      })}
    </ContentList>
  );
}

export default OfflineCollection;
