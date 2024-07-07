import Box from '@mui/material/Box';
import { useEffect } from 'react';

import { useTitle } from '../layout/TitleContext';

function Settings() {
  const { setTitle } = useTitle();

  useEffect(() => setTitle('Settings'), []);

  return <Box sx={{ flexGrow: 1 }}>Settings placeholder</Box>;
}

export default Settings;
