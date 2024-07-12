import { Breadcrumbs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useApiService } from '../api-service/api-context';
import {
  FolderContentRecord,
  FolderMetainfo
} from '../api-service/api-service';
import { useOnline } from '../api-service/useOnline';
import { useTitle } from '../layout/TitleContext';
import { ArrayHelper } from '../lib/ArrayHelper';
import ContentList from '../lib/components/content-list/ContentList';
import { ContentCache } from '../lib/content-cache';
import { IterableHelper } from '../lib/iterable-helper';

import FileCard from './FileCard';
import FolderCard from './FolderCard';

interface BreadcrumbItem {
  caption: string;
  path: string;
}

function FolderCollection() {
  const baseURL = import.meta.env.BASE_URL;
  const { id, '*': path } = useParams();
  const api = useApiService();
  const { setTitle } = useTitle();
  const isOnline = useOnline();
  const [content, setContent] = useState<FolderContentRecord[]>([]);
  const [metainfo, setMetainfo] = useState<FolderMetainfo>({
    collectionId: 'unknown',
    folder: 'unknown',
    syncedAt: 0
  });
  const [cachedFiles, setCachedFiles] = useState<string[]>([]);

  const sortedContent = useMemo(
    () =>
      content.sort((a, b) => {
        const aKey = (a.type === 'folder' ? a.name : a.filename).toLowerCase();
        const bKey = (b.type === 'folder' ? b.name : b.filename).toLowerCase();

        return aKey === bKey ? 0 : aKey < bKey ? -1 : 1;
      }),
    [content]
  );

  function folderPreview(assetPrefix: string): string {
    return assetPrefix === 'folder_cover'
      ? `${baseURL}img/folder_cover.jpg`
      : `${baseURL}api/folder/preview/${assetPrefix}.jpg`;
  }

  useEffect(() => setTitle('Folder collection'), []);

  useEffect(() => {
    const fetchFolderContent = async () => {
      setContent(
        await api.listFolderCollectionContent(Number.parseInt(id!), path!)
      );
    };

    fetchFolderContent();
  }, [id, path]);

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const collectionEntry = `${baseURL}folder-collection/${id}`;
    const root = { caption: metainfo.collectionId, path: collectionEntry };

    if (path!.length === 0) {
      return [root];
    }

    let acc = '';
    const breadcrumbs = path!.split('/').map((x) => {
      acc += `/${x}`;
      return { caption: x, path: `${collectionEntry}${acc}` };
    });

    return [root, ...breadcrumbs];
  }, [metainfo, path]);

  const onDeleteFile = (filename: string) =>
    setContent(
      ArrayHelper.filterFirst(
        content,
        (x) => !(x.type === 'file' && x.filename === filename)
      )
    );

  const onCache = async (filename: string, action: 'cache' | 'evict') => {
    switch (action) {
      case 'cache':
        setCachedFiles([...cachedFiles, filename]);
        break;
      case 'evict':
        setCachedFiles(
          ArrayHelper.filterFirst(cachedFiles, (x) => x !== filename)
        );
        break;
    }
  };

  const onDeleteFolder = (name: string) =>
    setContent(
      ArrayHelper.filterFirst(
        content,
        (x) => !(x.type === 'folder' && x.name === name)
      )
    );

  const isCached = (filename: string) => cachedFiles.includes(filename);

  const isAvailable = (filename: string) => isOnline || isCached(filename);

  useEffect(() => {
    const fetchFolderInfo = async () => {
      setMetainfo(await api.folderInfo(Number.parseInt(id!)));
    };

    fetchFolderInfo();
  }, [id]);

  useEffect(() => {
    const pathDepth = (path: string) =>
      IterableHelper.countIf(path, (x) => x === '/');

    const fetchCachedFiles = async () => {
      setCachedFiles(
        await ContentCache.filterContent((filename) => {
          const prefix = path === '' ? `${id}/` : `${id}/${path}/`;
          const prefixDepth = pathDepth(prefix);

          return (
            filename.startsWith(prefix) && pathDepth(filename) === prefixDepth
          );
        })
      );
    };

    fetchCachedFiles();
  }, [id, path]);

  return (
    <>
      <Breadcrumbs aria-label="breadcrumb">
        {breadcrumbs.slice(0, -1).map((x) => (
          <Link key={x.path} color="inherit" to={x.path}>
            <Typography color="text.primary">{x.caption}</Typography>
          </Link>
        ))}
        {breadcrumbs.slice(-1).map((x) => (
          <Typography key={x.path} color="text.primary">
            {x.caption}
          </Typography>
        ))}
      </Breadcrumbs>
      <ContentList>
        {sortedContent.map((x) => {
          switch (x.type) {
            case 'file':
              return (
                <FileCard
                  key={x.filename}
                  filename={x.filename}
                  size={x.size}
                  duration={x.duration}
                  width={x.width}
                  height={x.height}
                  preview={`${baseURL}api/file/preview/${x.assetPrefix}.jpg`}
                  createdAt={x.createdAt}
                  onDelete={onDeleteFile}
                  onCache={onCache}
                  isAvailable={isAvailable(x.filename)}
                  isCached={isCached(x.filename)}
                />
              );
            case 'folder':
              return (
                <FolderCard
                  key={x.name}
                  name={x.name}
                  size={x.size}
                  files={x.files}
                  preview={folderPreview(x.assetPrefix)}
                  onDelete={onDeleteFolder}
                />
              );
          }
        })}
      </ContentList>
    </>
  );
}

export default FolderCollection;
