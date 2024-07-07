import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from '@mui/material';
import dateFormat from 'dateformat';
import prettyBytes from 'pretty-bytes';

import { formatDuration } from '../lib/format-duration';
import { RWState } from '../lib/rw-state';

export interface FileInfoDialogProps extends RWState<'open', boolean> {
  filename: string;
  size: number;
  duration: number;
  createdAt: number;
  width: number;
  height: number;
}

function FileInfoDialog({
  filename,
  createdAt,
  open,
  setOpen,
  size,
  duration,
  width,
  height
}: FileInfoDialogProps) {
  const onClose = () => setOpen(false);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{filename}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            Created at: {dateFormat(createdAt, 'yyyy-mm-dd HH:MM:ss')}
          </Typography>
          <Typography>Resolution: {`${width}x${height}`}</Typography>
          <Typography>Duration: {formatDuration(duration)}</Typography>
          <Typography>Size: {prettyBytes(size)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FileInfoDialog;
