import Box from '@mui/material/Box';
import { useEffect } from 'react';

import { useTitle } from '../layout/TitleContext';

import AppInfo from './AppInfo';
import Player from './Player';

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
