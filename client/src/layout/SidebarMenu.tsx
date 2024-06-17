import {
  Drawer,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Context } from '../lib/Context';
import { Dashboard, Login, Settings } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import styles from './sidebar-menu.module.css';

function SidebarMenu({ open, setOpen }: Context<'open', boolean>) {
  const toggleDrawer = (newOpen: boolean) => () => setOpen(newOpen);

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

export default SidebarMenu;
