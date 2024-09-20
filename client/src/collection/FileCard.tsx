import {
  Delete,
  Info,
  Menu as MenuIcon,
  PlayArrow,
  CloudDownload as CloudDownloadIcon,
  CloudDownloadOutlined as CloudDownloadOutlinedIcon,
  DownloadDone as DownloadDoneIcon,
  OpenWith as OpenWithIcon
} from '@mui/icons-material';
import {
  Card,
  CardMedia,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import {
  MouseEvent,
  SyntheticEvent,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAppDispatch } from '../hooks';
import { formatDuration } from '../lib/format-duration';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import styles from './file-card.module.css';
import FileInfoDialog from './FileInfoDialog';
import OpenWithDialog from './open-with-dialog';
import RenameDialog from './rename-dialog';
import { updateLastWatched } from './store/last-watched';

import { ApiService } from '@/api-service/api-service';
import { DownloadManager } from '@/download-manager/download-manager';
import { useDownloadProgress } from '@/download-manager/use-download-progress';
import { Inversify } from '@/inversify';
import RenameIcon from '@/lib/components/icons/rename-icon';
import { useSnackbar } from '@/lib/hooks/use-snackbar';
import { Path } from '@/lib/path';

export interface FileCardProps {
  filename: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  assetPrefix: string;
  createdAt: number;
  isAvailable: boolean;
  isCached: boolean;
  onDelete: (filename: string) => void;
  onCache: (filename: string, action: 'cache' | 'evict') => void;
  onRename: (
    filename: string,
    assetPrefix: string,
    newBasename: string,
    newAssetPrefix: string
  ) => void;
}

type Availability = 'uncached' | 'caching' | 'cached';

interface DownloadMenuProps {
  filename: string;
  availability: Availability;
  onClose: (e: MouseEvent<HTMLElement>) => void;
  onCache: (filename: string, action: 'cache' | 'evict') => void;
}

function DownloadMenuItem({
  filename,
  onClose,
  onCache,
  availability
}: DownloadMenuProps) {
  const downloadMedia = async (e: MouseEvent<HTMLElement>) => {
    onCache(filename, 'cache');
    onClose(e);
  };

  const evictMedia = async (e: MouseEvent<HTMLElement>) => {
    onCache(filename, 'evict');
    onClose(e);
  };

  switch (availability) {
    case 'cached':
      return (
        <MenuItem onClick={evictMedia}>
          <ListItemIcon>
            <CloudDownloadOutlinedIcon />
          </ListItemIcon>
          <ListItemText>Erase</ListItemText>
        </MenuItem>
      );
    case 'caching':
      return (
        <MenuItem disabled={true}>
          <ListItemIcon>
            <CloudDownloadIcon />
          </ListItemIcon>
          <ListItemText>Saving...</ListItemText>
        </MenuItem>
      );
    case 'uncached':
      return (
        <MenuItem onClick={downloadMedia}>
          <ListItemIcon>
            <CloudDownloadIcon />
          </ListItemIcon>
          <ListItemText>Save</ListItemText>
        </MenuItem>
      );
  }
}

const api = Inversify.get(ApiService);
const downloadManager = Inversify.get(DownloadManager);

function FileCard(props: FileCardProps) {
  const baseURL = import.meta.env.BASE_URL;
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(menuAnchor);
  const [fileInfoDialogOpened, setFileInfoDialogOpened] = useState(false);
  const [deleteConfirmDialogOpened, setDeleteConfirmDialogOpened] =
    useState(false);
  const [renameDialogOpened, setRenameDialogOpened] = useState(false);
  const [openWithDialogOpened, setOpenWithDialogOpened] = useState(false);

  const openMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setMenuAnchor(e.currentTarget);
  };

  const preview = useMemo(
    () => `${baseURL}api/file/preview/${props.assetPrefix}.jpg`,
    [props.assetPrefix]
  );

  const scrubbingStripe = useMemo(
    () => `${baseURL}api/file/scrubbing/${props.assetPrefix}.jpg`,
    [props.assetPrefix]
  );

  const videoUrl = useMemo(
    () => `${baseURL}api/file/content/${props.filename}`,
    [props.filename]
  );

  const downloadProgress = useDownloadProgress(videoUrl);

  useEffect(
    () =>
      void (downloadProgress === 1 && props.onCache(props.filename, 'cache')),
    [downloadProgress]
  );

  const isDownloading = useMemo(() => downloadProgress > 0, [downloadProgress]);

  const availability: Availability = props.isCached
    ? 'cached'
    : isDownloading
      ? 'caching'
      : 'uncached';

  const onCache = async (filename: string, action: 'cache' | 'evict') => {
    switch (action) {
      case 'cache':
        {
          try {
            await downloadManager.download({
              mediaUrl: videoUrl,
              coverUrl: preview,
              scrubbingStripUrl: scrubbingStripe
            });

            enqueueSnackbar(
              <>
                <DownloadDoneIcon sx={{ marginRight: '5px' }} />
                {props.filename}
              </>,
              {
                variant: 'info',
                hideIconVariant: true,
                autoHideDuration: 2500
              }
            );

            props.onCache(filename, 'cache');
          } catch (e) {
            console.error(e);
          }
        }
        break;

      case 'evict':
        {
          try {
            await downloadManager.delete({
              mediaUrl: videoUrl,
              coverUrl: preview,
              scrubbingStripUrl: scrubbingStripe
            });

            props.onCache(filename, 'evict');
          } catch (e) {
            console.error(e);
          }
        }
        break;
    }
  };

  const closeMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(null);
  };

  const deleteFile = async () => {
    if (await api.deleteFile(props.filename)) {
      await onCache(props.filename, 'evict');

      enqueueSnackbar('Deleted', {
        variant: 'info',
        autoHideDuration: 2500
      });

      props.onDelete(props.filename);
    } else {
      enqueueSnackbar('Failed to delete the file', {
        variant: 'warning',
        autoHideDuration: 2000
      });
    }
  };

  const onRenameConfirm = async (newBasename: string) => {
    const renamed = await api.renameFile(props.filename, newBasename);

    if (renamed.success) {
      props.onRename(
        props.filename,
        props.assetPrefix,
        newBasename,
        renamed.assetPrefix
      );
    } else {
      enqueueSnackbar('Failed to rename the file', {
        variant: 'warning',
        autoHideDuration: 2000
      });
    }
  };

  const openFileInfo = (e: MouseEvent<HTMLElement>) => {
    setFileInfoDialogOpened(true);

    closeMenu(e);
  };

  const openDeleteConfirmDialog = (e: MouseEvent<HTMLElement>) => {
    setDeleteConfirmDialogOpened(true);

    closeMenu(e);
  };

  const openRenameDialog = (e: MouseEvent<HTMLElement>) => {
    setRenameDialogOpened(true);

    closeMenu(e);
  };

  const openOpenWithDialog = (e: MouseEvent<HTMLElement>) => {
    setOpenWithDialogOpened(true);

    closeMenu(e);
  };

  const name = useMemo(
    () => props.filename.split('/').slice(-1)[0],
    [props.filename]
  );

  const saveLastWacthed = () => dispatch(updateLastWatched(name));
  const blockNavigation = (e: MouseEvent<HTMLElement>) => e.preventDefault();

  const fallbackToDefaultCover = (
    e?: SyntheticEvent<HTMLImageElement, Event>
  ) => {
    if (e !== undefined) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = `${baseURL}img/default_preview.webp`;
    }
  };

  const previewClassName = useMemo(
    () => (props.isAvailable ? '' : styles.unavailable),
    [props.isAvailable]
  );

  const titleClassName = useMemo(
    () => `${styles.title} ${props.isCached ? styles.titleCached : ''}`,
    [props.isCached]
  );

  const titleDownloadProgressClipPath = useMemo(
    () => `inset(0 ${100 - downloadProgress * 100}% 0 0)`,
    [downloadProgress]
  );

  return (
    <>
      <Link
        data-index={name}
        component={RouterLink}
        to={`${baseURL}play/${props.filename}`}
        state={{ assetPrefix: props.assetPrefix }}
        onClick={props.isAvailable ? saveLastWacthed : blockNavigation}
      >
        <Card className={styles.container} style={{ margin: '2px' }}>
          <CardMedia
            className={previewClassName}
            component="img"
            height="140"
            image={preview}
            onError={fallbackToDefaultCover}
          ></CardMedia>
          <PlayArrow
            sx={{ fontSize: '2em' }}
            className={styles.playIcon}
          ></PlayArrow>
          <Typography
            className={titleClassName}
            gutterBottom
            variant="h5"
            component="div"
          >
            {name}
          </Typography>
          {isDownloading && (
            <Typography
              sx={{ clipPath: titleDownloadProgressClipPath }}
              className={`${styles.title} ${styles.titleCached}`}
              gutterBottom
              variant="h5"
              component="div"
            >
              {name}
            </Typography>
          )}

          <Typography
            className={styles.duration}
            style={{ margin: 0 }}
            gutterBottom
            variant="subtitle1"
            component="div"
          >
            {formatDuration(props.duration)}
          </Typography>
          <IconButton
            onClick={openMenu}
            className={styles.menu}
            style={{ position: 'absolute', margin: 0 }}
          >
            <MenuIcon></MenuIcon>
          </IconButton>
        </Card>
      </Link>
      <Menu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={closeMenu}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
      >
        <MenuItem onClick={openOpenWithDialog}>
          <ListItemIcon>
            <OpenWithIcon />
          </ListItemIcon>
          <ListItemText>Open with</ListItemText>
        </MenuItem>
        <DownloadMenuItem
          filename={props.filename}
          availability={availability}
          onCache={onCache}
          onClose={closeMenu}
        />
        <MenuItem onClick={openDeleteConfirmDialog}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        <MenuItem onClick={openRenameDialog}>
          <ListItemIcon>
            <RenameIcon />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={openFileInfo}>
          <ListItemIcon>
            <Info />
          </ListItemIcon>
          <ListItemText>Info</ListItemText>
        </MenuItem>
      </Menu>
      <FileInfoDialog
        open={fileInfoDialogOpened}
        setOpen={setFileInfoDialogOpened}
        filename={props.filename}
        createdAt={props.createdAt}
        width={props.width}
        height={props.height}
        size={props.size}
        duration={props.duration}
      />
      <DeleteConfirmDialog
        onOk={deleteFile}
        open={deleteConfirmDialogOpened}
        setOpen={setDeleteConfirmDialogOpened}
        filename={props.filename}
      />
      {renameDialogOpened && (
        <RenameDialog
          open={renameDialogOpened}
          setOpen={setRenameDialogOpened}
          basenamePlaceholder={Path.basename(props.filename)}
          extension={Path.extension(props.filename)}
          onApply={onRenameConfirm}
        />
      )}
      <OpenWithDialog
        filename={props.filename}
        assetPrefix={props.assetPrefix}
        open={openWithDialogOpened}
        setOpen={setOpenWithDialogOpened}
      />
    </>
  );
}

export default FileCard;
