import { Box, Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import { FormEvent, useState } from 'react';

import { Tag } from '@/api-service/meta-info';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { RWState } from '@/lib/rw-state';

export interface AddTagDialogProps extends RWState<'open', boolean> {
  tagTree: TagTree;
  tags: Tag[];
  onApply: (tag: string) => void;
}

export function AddTagDialog({
  open,
  setOpen,
  tagTree,
  tags,
  onApply
}: AddTagDialogProps) {
  const [selectedTag, setSelectedTag] = useState('');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (selectedTag.length > 0) {
      onApply(selectedTag);
    }

    setOpen(false);

    e.preventDefault();
  };

  const onClose = () => {
    setOpen(false);
  };

  const onTagSelect = (tag: string) => setSelectedTag(tag);

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth={false}>
      <DialogTitle>Add tag</DialogTitle>
      <form onSubmit={onSubmit}>
        <TagTree
          tree={tagTree}
          tagsStyle={tags}
          itemComponent={({ label }) => (
            <Box
              sx={{ display: 'inline', fontWeight: 'bold', fontSize: '2em' }}
            >
              {label}
            </Box>
          )}
          onSelect={onTagSelect}
          style={{ height: '70vh' }}
        />
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
