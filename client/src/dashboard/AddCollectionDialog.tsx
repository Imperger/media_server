import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { RWState } from '../lib/rw-state';
import { CreateCollectionParameters } from './type';
import { CollectionType } from '../api-service/api-service';

export interface AddCollectionDialogProps extends RWState<'open', boolean> {
  onApply: (collection: CreateCollectionParameters) => void;
}

type ExtraOptionsProps = RWState<'folder', string> &
  RWState<'collectionId', string> & { type: CollectionType };

function ExtraOptions({
  type,
  collectionId,
  setCollectionId,
  folder,
  setFolder
}: ExtraOptionsProps) {
  return type === 'folder' ? (
    <Stack>
      <TextField
        label="Id"
        variant="standard"
        value={collectionId}
        onChange={(e) => setCollectionId(e.target.value)}
      />
      <TextField
        label="Folder"
        variant="standard"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
      />
    </Stack>
  ) : null;
}

function AddCollectionDialog({
  open,
  setOpen,
  onApply
}: AddCollectionDialogProps) {
  const [caption, setCaption] = useState('');
  const [type, setType] = useState<CollectionType>('folder');
  const [collectionId, setCollectionId] = useState('');
  const [folder, setFolder] = useState('');

  const onClose = () => {
    setOpen(false);
    setCaption('');
    setType('folder');
    setCollectionId('');
    setFolder('');
  };

  const handleChange = (event: SelectChangeEvent) => {
    setType(event.target.value as CollectionType);
  };

  const onCreate = () => {
    onClose();
    onApply({ caption, type, collectionId, folder });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    onCreate();
    e.preventDefault();
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus>
      <form onSubmit={onSubmit}>
        <DialogTitle>New collection</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Caption"
              variant="standard"
              autoFocus
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <InputLabel id="type-label">Type</InputLabel>
            <Select
              labelId="type-label"
              value={type}
              label="Type"
              onChange={handleChange}
            >
              <MenuItem value={'folder'}>Folder</MenuItem>
              <MenuItem value={'view'}>View</MenuItem>
            </Select>
            <ExtraOptions
              type={type}
              collectionId={collectionId}
              setCollectionId={setCollectionId}
              folder={folder}
              setFolder={setFolder}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="secondary" type="submit">
            Create
          </Button>
          <Button color="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AddCollectionDialog;
