import {
  Dashboard,
  Login,
  Settings,
  CloudDownload as CloudDownloadIcon,
  Tag as TagIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import {
  Drawer,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { RWState } from '../lib/rw-state';

import styles from './sidebar-menu.module.css';

import type { FolderCollectionPrefix } from '@/router';

function pathnameToSearchPath(pathname: string): string {
  const folderCollectionPrefix: FolderCollectionPrefix = '/folder-collection';

  if (pathname.startsWith(folderCollectionPrefix)) {
    return pathname.substring(folderCollectionPrefix.length + 1);
  }

  return '';
}

export default function SidebarMenu({
  open,
  setOpen
}: RWState<'open', boolean>) {
  const location = useLocation();
  const toggleDrawer = (newOpen: boolean) => () => setOpen(newOpen);
  const searchPath = useMemo(
    () => pathnameToSearchPath(location.pathname),
    [location.pathname]
  );

  return (
    <Drawer open={open} onClose={toggleDrawer(false)}>
      <ListItem disablePadding>
        <ListItemButton component={Link} to={`/`} onClick={toggleDrawer(false)}>
          <ListItemIcon>
            <Dashboard className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Dashboard'} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          to={`/search`}
          state={{ searchPath }}
          onClick={toggleDrawer(false)}
        >
          <ListItemIcon>
            <SearchIcon className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Search'} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          to={`/offline-collection`}
          onClick={toggleDrawer(false)}
        >
          <ListItemIcon>
            <CloudDownloadIcon className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Saved'} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          to={`/tags`}
          onClick={toggleDrawer(false)}
        >
          <ListItemIcon>
            <TagIcon className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Tags'} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          component={Link}
          to={`/settings`}
          onClick={toggleDrawer(false)}
        >
          <ListItemIcon>
            <Settings className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Settings'} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding onClick={toggleDrawer(false)}>
        <ListItemButton>
          <ListItemIcon>
            <Login className={styles.icon} />
          </ListItemIcon>
          <ListItemText className={styles.text} primary={'Sign in'} />
        </ListItemButton>
      </ListItem>
    </Drawer>
  );
}
