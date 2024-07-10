import { Delete, Folder, Menu as MenuIcon } from '@mui/icons-material';
import {
  Badge,
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
import prettyBytes from 'pretty-bytes';
import { useMemo, MouseEvent, useState, SyntheticEvent } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useApiService } from '../api-service/api-context';
import { useAppDispatch } from '../hooks';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import styles from './folder-card.module.css';
import { resetLastWatched } from './store/last-watched';

export interface FolderCardProps {
  name: string;
  preview: string;
  size: number;
  files: number;
  onDelete: (name: string) => void;
}

function FolderCard({ name, size, files, onDelete, preview }: FolderCardProps) {
  const baseURL = import.meta.env.BASE_URL;
  const api = useApiService();
  const { id, '*': path } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const saveLastWacthed = () => void dispatch(resetLastWatched());
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(menuAnchor);
  const [deleteConfirmDialogOpened, setDeleteConfirmDialogOpened] =
    useState(false);

  const pathPrefix = useMemo(() => `${path}${path!.length ? '/' : ''}`, [path]);

  const deleteFolder = async () => {
    if (await api.deleteFolder(Number.parseInt(id!), `${pathPrefix}${name}`)) {
      enqueueSnackbar('Deleted', {
        variant: 'info',
        autoHideDuration: 2500
      });

      onDelete(name);
    } else {
      enqueueSnackbar('Failed to delete the folder', {
        variant: 'warning',
        autoHideDuration: 2000
      });
    }
  };

  const openMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(e.currentTarget);
  };

  const closeMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();

    setMenuAnchor(null);
  };

  const openDeleteConfirmDialog = (e: MouseEvent<HTMLElement>) => {
    setDeleteConfirmDialogOpened(true);

    closeMenu(e);
  };

  const fallbackToDefaultCover = (
    e?: SyntheticEvent<HTMLImageElement, Event>
  ) => {
    if (e !== undefined) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = `${baseURL}img/folder_cover.jpg`;
    }
  };

  return (
    <>
      <Link
        data-index={name}
        component={RouterLink}
        to={`${pathPrefix}${name}`}
        onClick={saveLastWacthed}
      >
        <Card className={styles.container} style={{ margin: '2px' }}>
          <CardMedia
            component="img"
            height="140"
            image={preview}
            onError={fallbackToDefaultCover}
          ></CardMedia>
          <Badge
            sx={{ position: 'absolute' }}
            className={styles.folder}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            badgeContent={files}
            color="secondary"
          >
            <Folder />
          </Badge>
          <Typography
            className={styles.title}
            gutterBottom
            variant="h5"
            component="div"
          >
            {name}
          </Typography>
          <Typography
            className={styles.size}
            style={{ margin: 0 }}
            gutterBottom
            variant="subtitle1"
            component="div"
          >
            {prettyBytes(size)}
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
        <MenuItem onClick={openDeleteConfirmDialog}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      <DeleteConfirmDialog
        onOk={deleteFolder}
        open={deleteConfirmDialogOpened}
        setOpen={setDeleteConfirmDialogOpened}
        filename={name}
      ></DeleteConfirmDialog>
    </>
  );
}

export default FolderCard;
