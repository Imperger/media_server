import prettyBytes from 'pretty-bytes';
import { useEffect, useMemo, useState } from 'react';

import { ApiService, FileRecord } from '../api-service/api-service';
import FileCard from '../collection/file-card';
import { useTitle } from '../layout/title-context';
import { ArrayHelper } from '../lib/array-helper';
import { less } from '../lib/comparator';
import ContentList from '../lib/components/content-list/content-list';
import { ContentCache } from '../lib/content-cache';
import { AsyncExceptionTrap } from '../lib/exception-trap';
import { parseFilename } from '../lib/parse-filename';

import { Inversify } from '@/inversify';

const api = Inversify.get(ApiService);

function OfflineCollection() {
  const { setTitle } = useTitle();
  const [savedContent, setSavedContent] = useState<FileRecord[]>([]);

  const updateTitle = async (cancelator: { value: boolean }) => {
    const size = await ContentCache.contentSize();

    if (!cancelator.value) {
      setTitle(`Saved (${prettyBytes(size)})`);
    }
  };

  useEffect(() => {
    setTitle('Saved');

    const cancelator = { value: false };

    updateTitle(cancelator);

    return void (cancelator.value = true);
  }, []);

  useEffect(() => {
    const cancelator = { value: false };

    updateTitle(cancelator);

    return () => void (cancelator.value = true);
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
      savedContent.sort((a, b) =>
        less(a.filename.toLowerCase(), b.filename.toLowerCase())
      ),
    [savedContent]
  );

  const onCache = async (filename: string, action: 'cache' | 'evict') => {
    if (action === 'evict') {
      setSavedContent(
        ArrayHelper.discardFirst(savedContent, (x) => x.filename === filename)
      );
    }
  };

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
            assetPrefix={x.assetPrefix}
            createdAt={x.createdAt}
            onDelete={() => 0}
            onRename={() => 0}
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
