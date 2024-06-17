import Box from '@mui/material/Box';
import { useTitle } from '../layout/TitleContext';
import { useEffect } from 'react';

function Settings() {
  const { setTitle } = useTitle();

  useEffect(() => setTitle('Settings'), []);

  return <Box sx={{ flexGrow: 1 }}>Settings placeholder</Box>;
}

export default Settings;
