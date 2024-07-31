import { Circle } from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import { lightGreen, red } from '@mui/material/colors';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { SnackbarProvider } from 'notistack';
import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useOnline } from '../api-service/use-online';

import SidebarMenu from './SidebarMenu';
import { TitleContext } from './TitleContext';

function Layout() {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  const isOnline = useOnline();

  const toggleDrawer = (newOpen: boolean) => () => setOpen(newOpen);

  const onlineIconColor = useMemo(
    () => (isOnline ? lightGreen[500] : red[500]),
    [isOnline]
  );

  return (
    <TitleContext.Provider value={{ title, setTitle }}>
      <SnackbarProvider maxSnack={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <AppBar position="static">
            <Toolbar>
              <IconButton
                size="large"
                edge="start"
                color="secondary"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {title}
              </Typography>
              <Circle sx={{ color: onlineIconColor }} />
              <SidebarMenu open={open} setOpen={setOpen} />
            </Toolbar>
          </AppBar>
          <Outlet />
        </Box>
      </SnackbarProvider>
    </TitleContext.Provider>
  );
}

export default Layout;
