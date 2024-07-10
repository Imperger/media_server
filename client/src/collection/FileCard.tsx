import {
  Delete,
  Info,
  Menu as MenuIcon,
  PlayArrow,
  CloudDownload as CloudDownloadIcon,
  CloudDownloadOutlined as CloudDownloadOutlinedIcon
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
import { useSnackbar } from 'notistack';
import {
  MouseEvent,
  SyntheticEvent,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useApiService } from '../api-service/api-context';
import { useAppDispatch } from '../hooks';
import { ContentCache } from '../lib/content-cache';
import { formatDuration } from '../lib/format-duration';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import styles from './file-card.module.css';
import FileInfoDialog from './FileInfoDialog';
import { updateLastWatched } from './store/last-watched';

export interface FileCardProps {
  filename: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  preview: string;
  createdAt: number;
  onDelete: (filename: string) => void;
}

interface DownloadMenuProps {
  filename: string;
  preview: string;
  onClose: (e: MouseEvent<HTMLElement>) => void;
}

function DownloadMenyItem({ filename, preview, onClose }: DownloadMenuProps) {
  const baseURL = import.meta.env.BASE_URL;

  const videoUrl = useMemo(
    () => `${baseURL}api/file/content/${filename}`,
    [filename]
  );

  const [isCached, setIsCached] = useState(false);

  const downloadMedia = async (e: MouseEvent<HTMLElement>) => {
    onClose(e);

    try {
      await ContentCache.cacheFile(videoUrl, (x) => console.log(x));
      await ContentCache.cacheFile(preview, (x) => console.log(x));
    } catch (e) {
      console.error(e);
    }
  };

  const evictMedia = async (e: MouseEvent<HTMLElement>) => {
    try {
      await ContentCache.evictFile(videoUrl);
      await ContentCache.evictFile(preview);
    } catch (e) {
      console.error(e);
    }

    onClose(e);
  };

  useEffect(() => {
    const fetchCachingState = async () =>
      setIsCached(await ContentCache.isCached(videoUrl));

    fetchCachingState();
  }, []);

  return isCached ? (
    <MenuItem onClick={evictMedia}>
      <ListItemIcon>
        <CloudDownloadOutlinedIcon />
      </ListItemIcon>
      <ListItemText>Erase</ListItemText>
    </MenuItem>
  ) : (
    <MenuItem onClick={downloadMedia}>
      <ListItemIcon>
        <CloudDownloadIcon />
      </ListItemIcon>
      <ListItemText>Save</ListItemText>
    </MenuItem>
  );
}

function FileCard(props: FileCardProps) {
  const baseURL = import.meta.env.BASE_URL;
  const api = useApiService();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(menuAnchor);
  const [fileInfoDialogOpened, setFileInfoDialogOpened] = useState(false);
  const [deleteConfirmDialogOpened, setDeleteConfirmDialogOpened] =
    useState(false);

  const openMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(e.currentTarget);
  };

  const closeMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(null);
  };

  const deleteFile = async () => {
    if (await api.deleteFile(props.filename)) {
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

  const openFileInfo = (e: MouseEvent<HTMLElement>) => {
    setFileInfoDialogOpened(true);

    closeMenu(e);
  };

  const openDeleteConfirmDialog = (e: MouseEvent<HTMLElement>) => {
    setDeleteConfirmDialogOpened(true);

    closeMenu(e);
  };

  const name = useMemo(
    () => props.filename.split('/').slice(-1)[0],
    [props.filename]
  );

  const saveLastWacthed = () => dispatch(updateLastWatched(name));

  const fallbackToDefaultCover = (
    e?: SyntheticEvent<HTMLImageElement, Event>
  ) => {
    if (e !== undefined) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = `${baseURL}img/default_preview.webp`;
    }
  };

  return (
    <>
      <Link
        data-index={name}
        component={RouterLink}
        to={`${baseURL}play/${props.filename}`}
        onClick={saveLastWacthed}
      >
        <Card className={styles.container} style={{ margin: '2px' }}>
          <CardMedia
            component="img"
            height="140"
            image={props.preview}
            onError={fallbackToDefaultCover}
          ></CardMedia>
          <PlayArrow
            sx={{ fontSize: '2em' }}
            className={styles.playIcon}
          ></PlayArrow>
          <Typography
            className={styles.title}
            gutterBottom
            variant="h5"
            component="div"
          >
            {name}
          </Typography>
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
        <DownloadMenyItem
          filename={props.filename}
          preview={props.preview}
          onClose={closeMenu}
        />
        <MenuItem onClick={openDeleteConfirmDialog}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
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
      ></FileInfoDialog>
      <DeleteConfirmDialog
        onOk={deleteFile}
        open={deleteConfirmDialogOpened}
        setOpen={setDeleteConfirmDialogOpened}
        filename={props.filename}
      ></DeleteConfirmDialog>
    </>
  );
}

export default FileCard;
