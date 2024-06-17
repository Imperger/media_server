import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApiService } from '../api-service/api-context';
import { Breadcrumbs, Stack, Typography, useMediaQuery } from '@mui/material';
import {
  FolderContentRecord,
  FolderMetainfo
} from '../api-service/api-service';
import FileCard from './FileCard';
import FolderCard from './FolderCard';
import { useTitle } from '../layout/TitleContext';
import { ArrayHelper } from '../lib/ArrayHelper';
import styles from './folder-collection.module.css';

interface BreadcrumbItem {
  caption: string;
  path: string;
}

function FolderCollection() {
  const baseURL = import.meta.env.BASE_URL;
  const { id, '*': path } = useParams();
  const api = useApiService();
  const { setTitle } = useTitle();
  const [content, setContent] = useState<FolderContentRecord[]>([]);
  const [metainfo, setMetainfo] = useState<FolderMetainfo>({
    collectionId: 'unknown',
    folder: 'unknown',
    syncedAt: 0
  });
  const isPortrait = useMediaQuery('(orientation: portrait)');

  const sortedContent = useMemo(
    () =>
      content.sort((a, b) => {
        const aKey = (a.type === 'folder' ? a.name : a.filename).toLowerCase();
        const bKey = (b.type === 'folder' ? b.name : b.filename).toLowerCase();

        return aKey === bKey ? 0 : aKey < bKey ? -1 : 1;
      }),
    [content]
  );

  useEffect(() => setTitle('Folder collection'));

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

  const pathPrefix = useMemo(() => `${path}${path!.length ? '/' : ''}`, [path]);

  const onDeleteFile = (filename: string) =>
    setContent(
      ArrayHelper.filterFirst(
        content,
        (x) => !(x.type === 'file' && x.filename === filename)
      )
    );

  useEffect(() => {
    const fetchFolderInfo = async () => {
      setMetainfo(await api.folderInfo(Number.parseInt(id!)));
    };

    fetchFolderInfo();
  }, [id]);

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
      <Stack
        sx={{ overflowY: 'auto', alignContent: 'flex-start' }}
        className={styles.content}
        direction={isPortrait ? 'column' : 'row'}
        flexWrap={isPortrait ? 'nowrap' : 'wrap'}
      >
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
                />
              );
            case 'folder':
              return (
                <Link key={x.name} to={`${pathPrefix}${x.name}`}>
                  <FolderCard
                    name={x.name}
                    preview={`${baseURL}api/folder/preview/${x.assetPrefix}.jpg`}
                  />
                </Link>
              );
          }
        })}
      </Stack>
    </>
  );
}

export default FolderCollection;
