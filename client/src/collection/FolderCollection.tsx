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
import { useTitle } from '../layout/TitleContext';
import { ArrayHelper } from '../lib/ArrayHelper';
import { greater, less } from '../lib/comparator';
import ContentList from '../lib/components/content-list/ContentList';
import FileSizeIcon from '../lib/components/icons/FileSizeIcon';
import { ContentCache } from '../lib/content-cache';
import { IterableHelper } from '../lib/iterable-helper';

import FileCard from './FileCard';
import styles from './folder-collection.module.css';
import FolderCard from './FolderCard';
import { SortRule, updateSortRule } from './store/sort-rule';

import { Inversify } from '@/inversify';

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
