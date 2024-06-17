import { createTheme } from '@mui/material';
import { amber, grey, lightBlue, lightGreen, red } from '@mui/material/colors';

export const Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: grey[800] },
    secondary: { main: grey[600] },
    error: { main: red[900] },
    warning: { main: amber[900] },
    info: { main: lightBlue[900] },
    success: { main: lightGreen[900] },
    background: { default: '#121212', paper: '#121212' },
    text: { primary: '#eeeeee' }
  }
});
