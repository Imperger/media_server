import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
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
import { useAppDispatch, useAppSelector } from '../hooks';
import { updateLastWatched } from './store/last-watched';

interface BreadcrumbItem {
  caption: string;
  path: string;
}

function nearestFolder(from: string, to: string): string {
  if (from.startsWith(to)) {
    const diff = from.slice(to.length + 1);
    return diff.split('/')[0];
  } else {
    return '';
  }
}

function FolderCollection() {
  const baseURL = import.meta.env.BASE_URL;
  const { id, '*': path } = useParams();
  const api = useApiService();
  const dispatch = useAppDispatch();
  const { setTitle } = useTitle();
  const fileListRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState<FolderContentRecord[]>([]);
  const [metainfo, setMetainfo] = useState<FolderMetainfo>({
    collectionId: 'unknown',
    folder: 'unknown',
    syncedAt: 0
  });
  const lastWatched = useAppSelector((state) => state.lastWatched.filename);

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

  const scrollToLastWatched = () => {
    if (fileListRef.current === null) {
      return;
    }

    const lastViewElement = fileListRef.current.querySelector(
      `a[data-index="${lastWatched}"]`
    );

    if (lastViewElement !== null) {
      lastViewElement.scrollIntoView(true);
    }
  };

  useEffect(() => setTitle('Folder collection'));

  useEffect(() => {
    const fetchFolderContent = async () => {
      setContent(
        await api.listFolderCollectionContent(Number.parseInt(id!), path!)
      );
    };

    fetchFolderContent();
  }, [id, path]);

  useBlocker(({ currentLocation, nextLocation }) => {
    const folderName = nearestFolder(
      decodeURI(currentLocation.pathname),
      decodeURI(nextLocation.pathname)
    );

    if (folderName !== '') {
      dispatch(updateLastWatched(folderName));
    } else {
      fileListRef.current?.scrollTo(0, 0);
    }

    return false;
  });

  useEffect(() => {
    scrollToLastWatched();
  }, [content]);

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

  const onDeleteFolder = (name: string) =>
    setContent(
      ArrayHelper.filterFirst(
        content,
        (x) => !(x.type === 'folder' && x.name === name)
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
        ref={fileListRef}
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
                <FolderCard
                  key={x.name}
                  name={x.name}
                  size={x.size}
                  files={x.files}
                  preview={`${baseURL}api/folder/preview/${x.assetPrefix}.jpg`}
                  onDelete={onDeleteFolder}
                />
              );
          }
        })}
      </Stack>
    </>
  );
}

export default FolderCollection;
