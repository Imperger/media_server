import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';

import styles from './app-info.module.css';

function AppInfo() {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="player-settings-content"
      >
        App info
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="a dense table">
            <TableBody>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 'bold' }}
                  className={styles.property}
                >
                  Build
                </TableCell>
                <TableCell>{import.meta.env.VITE_BUILD_VERSION}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}

export default AppInfo;
