import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

import { TitleContext } from './TitleContext';
import SidebarMenu from './SidebarMenu';
import { SnackbarProvider } from 'notistack';

function Layout() {
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => setOpen(newOpen);

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
