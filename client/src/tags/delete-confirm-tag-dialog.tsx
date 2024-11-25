import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';

import { RWState } from '../lib/rw-state';

import styles from './delete-confirm-tag-dialog.module.css';

export interface DeleteConfirmTagDialogProps extends RWState<'open', boolean> {
  tag: string;
  onOk: () => void;
}

export function DeleteConfirmTagDialog({
  tag,
  open,
  setOpen,
  onOk
}: DeleteConfirmTagDialogProps) {
  const confirmAndClose = () => {
    onOk();
    onClose();
  };

  const onClose = () => setOpen(false);
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Delete{<Typography className={styles.tag}>{tag}</Typography>}
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
