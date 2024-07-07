import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';

import { RWState } from '../lib/rw-state';

import styles from './delete-confirm-dialog.module.css';

export interface DeleteConfirmDialogProps extends RWState<'open', boolean> {
  filename: string;
  onOk: () => void;
}

export function DeleteConfirmDialog({
  filename,
  open,
  setOpen,
  onOk
}: DeleteConfirmDialogProps) {
  const confirmAndClose = () => {
    onOk();
    onClose();
  };

  const onClose = () => setOpen(false);
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Delete{<Typography className={styles.filename}>{filename}</Typography>}
      </DialogTitle>
      <DialogContent>
        <Typography>Are you sure?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={confirmAndClose} color="secondary">
          Ok
        </Button>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
