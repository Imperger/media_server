import {
  Sort as SortIcon,
  SortByAlpha as SortByAlphaIcon,
  AccessTime as AccessTimeIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import {
  Box,
  Breadcrumbs,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState, MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  ApiService,
  FolderContentRecord,
  FolderMetainfo
} from '../api-service/api-service';
import { useOnline } from '../api-service/use-online';
import { useAppDispatch, useAppSelector } from '../hooks';
import { useTitle } from '../layout/title-context';
import { ArrayHelper } from '../lib/array-helper';
import { greater, less } from '../lib/comparator';
import ContentList from '../lib/components/content-list/content-list';
import FileSizeIcon from '../lib/components/icons/file-size-icon';
import { ContentCache } from '../lib/content-cache';
import { IterableHelper } from '../lib/iterable-helper';

import FileCard from './file-card';
import FolderCard from './folder-card';
import styles from './folder-collection.module.css';
import { SortRule, updateSortRule } from './store/sort-rule';

import { Inversify } from '@/inversify';
import { Path } from '@/lib/path';

interface BreadcrumbItem {
  caption: string;
  path: string;
}

interface SortOrderProps {
  order: SortRule['order'];
}

function SortOrderIcon({ order }: SortOrderProps) {
  switch (order) {
    case 'asc':
      return <ArrowUpwardIcon />;
    case 'desc':
      return <ArrowDownwardIcon />;
    case 'none':
      return <Box sx={{ width: 24, height: 24 }}></Box>;
  }
}

interface SortMenuProps {
  sortRule: SortRule;
  setSortRule: (sortRule: SortRule) => void;
}

function SortMenu({ sortRule, setSortRule }: SortMenuProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(menuAnchor);

  const openMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setMenuAnchor(e.currentTarget);
  };

  const closeMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(null);
  };

  const onSortingChange = (
    e: MouseEvent<HTMLElement>,
    property: SortRule['property']
  ) => {
    if (property === sortRule.property) {
      setSortRule({
        property,
        order: sortRule.order === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortRule({ property, order: 'asc' });
    }

    closeMenu(e);
  };

  const sortIconOrder = (property: SortRule['property']) =>
    property === sortRule.property ? sortRule.order : 'none';

  return (
    <>
      <IconButton onClick={openMenu} size="small">
        <SortIcon />
      </IconButton>
      <Menu open={isMenuOpen} onClose={closeMenu} anchorEl={menuAnchor}>
        <MenuItem
          sx={{ paddingRight: '5px' }}
          onClick={(e) => onSortingChange(e, 'title')}
        >
          <ListItemIcon>
            <SortByAlphaIcon />
          </ListItemIcon>
          <ListItemText className={styles.sortMenuItemTitle}>
            Title
          </ListItemText>
          <SortOrderIcon order={sortIconOrder('title')} />
        </MenuItem>
        <MenuItem
          sx={{ paddingRight: '5px' }}
          onClick={(e) => onSortingChange(e, 'duration')}
        >
          <ListItemIcon>
            <AccessTimeIcon />
          </ListItemIcon>
          <ListItemText className={styles.sortMenuItemTitle}>
            Duration
          </ListItemText>
          <SortOrderIcon order={sortIconOrder('duration')} />
        </MenuItem>
        <MenuItem
          sx={{ paddingRight: '5px' }}
          onClick={(e) => onSortingChange(e, 'size')}
        >
          <ListItemIcon>
            <FileSizeIcon />
          </ListItemIcon>
          <ListItemText className={styles.sortMenuItemTitle}>Size</ListItemText>
          <SortOrderIcon order={sortIconOrder('size')} />
        </MenuItem>
      </Menu>
    </>
  );
}

function extractKey(obj: FolderContentRecord, rule: SortRule) {
  switch (rule.property) {
    case 'title':
      return (obj.type === 'folder' ? obj.name : obj.filename).toLowerCase();
    case 'duration':
      return obj.type === 'file'
        ? obj.duration
        : rule.order === 'asc'
          ? Number.POSITIVE_INFINITY
          : 0;
    case 'size':
      return obj.size;
  }
}

function pathDepth(path: string) {
  return IterableHelper.countIf(path, (x) => x === '/');
}

const api = Inversify.get(ApiService);

function FolderCollection() {
  const baseURL = import.meta.env.BASE_URL;
  const { id, '*': path } = useParams();
  const sortRule = useAppSelector((state) => state.folderCollectionSortRule);
  const dispatch = useAppDispatch();
  const { setTitle } = useTitle();
  const isOnline = useOnline();
  const [content, setContent] = useState<FolderContentRecord[]>([]);
  const [metainfo, setMetainfo] = useState<FolderMetainfo>({
    collectionId: 'unknown',
    folder: 'unknown',
    syncedAt: 0
  });
  const [cachedFiles, setCachedFiles] = useState<string[]>([]);
  const [cachedFolders, setCachedFolders] = useState<string[]>([]);

  const setSortRule = (sortRule: SortRule) =>
    dispatch(updateSortRule(sortRule));

  const sortedContent = useMemo(
    () =>
      content.sort((a, b) => {
        const aKey = extractKey(a, sortRule);
        const bKey = extractKey(b, sortRule);

        return sortRule.order === 'asc'
          ? less(aKey, bKey)
          : greater(aKey, bKey);
      }),
    [content, sortRule]
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

  const onRenameFile = async (
    filename: string,
    assetPrefix: string,
    newBasename: string,
    newAssetPrefix: string
  ) => {
    const movedCache = await ContentCache.moveFile(
      { filename, assetPrefix },
      {
        filename: `${Path.dirname(filename)}/${newBasename}`,
        assetPrefix: newAssetPrefix
      }
    );

    if (movedCache) {
      setCachedFiles(
        cachedFiles.map((x) =>
          x === filename ? `${Path.dirname(filename)}/${newBasename}` : x
        )
      );
    }

    setContent(
      content.map((x) =>
        x.type === 'file' && x.filename === filename
          ? {
              ...x,
              filename: `${Path.dirname(x.filename)}/${newBasename}`,
              assetPrefix: newAssetPrefix
            }
          : x
      )
    );
  };

  const onDeleteFile = (filename: string) =>
    setContent(
      ArrayHelper.discardFirst(
        content,
        (x) => x.type === 'file' && x.filename === filename
      )
    );

  const onCache = async (filename: string, action: 'cache' | 'evict') => {
    switch (action) {
      case 'cache':
        setCachedFiles([...cachedFiles, filename]);
        break;
      case 'evict':
        setCachedFiles(
          ArrayHelper.discardFirst(cachedFiles, (x) => x === filename)
        );
        break;
    }
  };

  const onDeleteFolder = (name: string) =>
    setContent(
      ArrayHelper.discardFirst(
        content,
        (x) => x.type === 'folder' && x.name === name
      )
    );

  const isFileCached = (filename: string) => cachedFiles.includes(filename);

  const isFileAvailable = (filename: string) =>
    isOnline || isFileCached(filename);

  const isFolderCached = (basename: string) => cachedFolders.includes(basename);

  const isFolderAvailable = (basename: string) =>
    isOnline || isFolderCached(basename);

  useEffect(() => {
    const fetchFolderInfo = async () => {
      setMetainfo(await api.folderInfo(Number.parseInt(id!)));
    };

    fetchFolderInfo();
  }, [id]);

  useEffect(() => {
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

  useEffect(() => {
    const updateOfflineFoldersAvailability = async () => {
      if (isOnline) {
        return;
      }

      const offlineFolders = await ContentCache.filterFolder(
        (cachedPath: string) => {
          const prefix = path === '' ? `${id}/` : `${id}/${path}/`;
          const prefixDepth = pathDepth(prefix);

          return (
            cachedPath.startsWith(prefix) &&
            pathDepth(cachedPath) === prefixDepth
          );
        }
      );

      setCachedFolders(
        offlineFolders.map((x) => x.slice(x.lastIndexOf('/') + 1))
      );
    };

    updateOfflineFoldersAvailability();
  }, [id, path, isOnline]);

  return (
    <>
      <Box className={styles.navigation}>
        <Breadcrumbs className={styles.breadcrumbs} aria-label="breadcrumb">
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
        <SortMenu
          sortRule={sortRule}
          setSortRule={(sortRule: SortRule) => setSortRule(sortRule)}
        />
      </Box>
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
                  assetPrefix={x.assetPrefix}
                  createdAt={x.createdAt}
                  onRename={onRenameFile}
                  onDelete={onDeleteFile}
                  onCache={onCache}
                  isAvailable={isFileAvailable(x.filename)}
                  isCached={isFileCached(x.filename)}
                />
              );
            case 'folder':
              return (
                <FolderCard
                  key={x.name}
                  name={x.name}
                  size={x.size}
                  files={x.files}
                  isAvailable={isFolderAvailable(x.name)}
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
