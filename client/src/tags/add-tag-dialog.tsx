import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Box
} from '@mui/material';
import { MuiColorInput } from 'mui-color-input';
import { FormEvent, useState } from 'react';

import { TagStyle } from '@/api-service/meta-info';
import { RWState } from '@/lib/rw-state';

export interface AddTagDialogProps extends RWState<'open', boolean> {
  tagPrefixPlaceholder: string;
  onApply: (tag: string, style: TagStyle) => void;
}

export default function AddTagDialog({
  open,
  setOpen,
  tagPrefixPlaceholder,
  onApply
}: AddTagDialogProps) {
  const [newTag, setNewTag] = useState(tagPrefixPlaceholder);
  const [backgroundColor, setBackgroundColor] = useState('#212121');
  const [fontColor, setFontColor] = useState('#eeeeee');

  const onBackgroundColorChange = (color: string) => setBackgroundColor(color);

  const onFontColorChange = (color: string) => setFontColor(color);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    onApply(newTag, { fontColor, backgroundColor });
    setOpen(false);

    e.preventDefault();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus>
      <DialogTitle>Add</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <TextField
            label="new tag"
            variant="standard"
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            slotProps={{
              htmlInput: { style: { color: fontColor, backgroundColor } }
            }}
          />
          <Box>
            <MuiColorInput
              format="hex"
              value={backgroundColor}
              onChange={onBackgroundColorChange}
            />

            <MuiColorInput
              format="hex"
              value={fontColor}
              onChange={onFontColorChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" type="submit">
            Add
          </Button>
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
