import {
  LocalMovies as LocalMoviesIcon,
  Tag as TagIcon
} from '@mui/icons-material';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { updateLastWatched } from './store/last-watched';

import { useAppDispatch } from '@/hooks';
import { RWState } from '@/lib/rw-state';

export interface OpenWithFileDialogProps extends RWState<'open', boolean> {
  filename: string;
  assetPrefix: string;
}

export default function OpenWithFileDialog({
  filename,
  assetPrefix,
  open,
  setOpen
}: OpenWithFileDialogProps) {
  const baseURL = import.meta.env.BASE_URL;
  const onClose = () => setOpen(false);
  const dispatch = useAppDispatch();

  const name = useMemo(() => filename.split('/').slice(-1)[0], [filename]);

  const saveLastWacthed = () => dispatch(updateLastWatched(name));

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select app</DialogTitle>
      <DialogContent>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to={`${baseURL}app/clip`}
              onClick={saveLastWacthed}
              state={{ filename, assetPrefix }}
            >
              <ListItemIcon>
                <LocalMoviesIcon />
              </ListItemIcon>
              <ListItemText primary="Clip app" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to={`${baseURL}app/tag`}
              onClick={saveLastWacthed}
              state={{ mode: 'file', filename, assetPrefix }}
            >
              <ListItemIcon>
                <TagIcon />
              </ListItemIcon>
              <ListItemText primary="Tag app" />
            </ListItemButton>
          </ListItem>
        </List>
      </DialogContent>
    </Dialog>
  );
}
