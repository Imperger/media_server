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
import { Link as RouterLink } from 'react-router-dom';

import { RWState } from '@/lib/rw-state';

export interface OpenWithDialogProps extends RWState<'open', boolean> {
  filename: string;
  assetPrefix: string;
}

export default function OpenWithDialog({
  filename,
  assetPrefix,
  open,
  setOpen
}: OpenWithDialogProps) {
  const baseURL = import.meta.env.BASE_URL;
  const onClose = () => setOpen(false);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select app</DialogTitle>
      <DialogContent>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to={`${baseURL}app/clip`}
              state={{ filename, assetPrefix }}
            >
              <ListItemIcon>
                <LocalMoviesIcon />
              </ListItemIcon>
              <ListItemText primary="Clip app" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton disabled>
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
