import Box from '@mui/material/Box';
import { useEffect } from 'react';

import { useTitle } from '../layout/title-context';

import AppInfo from './app-info';
import Player from './player';

function Settings() {
  const { setTitle } = useTitle();

  useEffect(() => setTitle('Settings'), []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Player />
      <AppInfo />
    </Box>
  );
}

export default Settings;
