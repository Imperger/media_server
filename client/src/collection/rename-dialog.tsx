import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  DialogActions,
  Button
} from '@mui/material';
import { FormEvent, useState } from 'react';

import { RWState } from '@/lib/rw-state';

export interface RenameDialogProps extends RWState<'open', boolean> {
  basenamePlaceholder: string;
  extension: string;
  onApply: (newBasename: string) => void;
}

export default function RenameDialog({
  open,
  setOpen,
  extension,
  onApply,
  basenamePlaceholder
}: RenameDialogProps) {
  const [newBasename, setNewBasename] = useState(basenamePlaceholder);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    onApply(`${newBasename}${extension}`);
    setOpen(false);

    e.preventDefault();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus>
      <DialogTitle>Rename</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <TextField
            label="new filename"
            variant="standard"
            autoFocus
            value={newBasename}
            onChange={(e) => setNewBasename(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{extension}</InputAdornment>
              )
            }}
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
