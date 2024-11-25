import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button
} from '@mui/material';
import { FormEvent, useState } from 'react';

import { RWState } from '@/lib/rw-state';

export interface AddTagDialogProps extends RWState<'open', boolean> {
  oldName: string;
  onApply: (tag: string) => void;
}

export default function RenameTagDialog({
  open,
  setOpen,
  oldName,
  onApply
}: AddTagDialogProps) {
  const [newTag, setNewTag] = useState(oldName);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    onApply(newTag);
    setOpen(false);

    e.preventDefault();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus>
      <DialogTitle>Rename {oldName}?</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <TextField
            label="new tag"
            variant="standard"
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="secondary" type="submit">
            Rename
          </Button>
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
