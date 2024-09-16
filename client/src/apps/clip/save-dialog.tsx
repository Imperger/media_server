import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField
} from '@mui/material';
import { FormEvent } from 'react';

import { RWState } from '@/lib/rw-state';

export interface SaveClipDialogProps
  extends RWState<'open', boolean>,
    RWState<'basename', string> {
  extension: string;
  onApply: () => void;
}

export default function SaveClipDialog({
  open,
  setOpen,
  basename,
  setBasename,
  extension,
  onApply
}: SaveClipDialogProps) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    onApply();
    setOpen(false);

    e.preventDefault();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus>
      <DialogTitle>Clip name</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <TextField
            label="basename"
            variant="standard"
            autoFocus
            value={basename}
            onChange={(e) => setBasename(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">{extension}</InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="secondary" type="submit">
            Make clip
          </Button>
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
