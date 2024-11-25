import { Tag as TagIcon } from '@mui/icons-material';
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

export interface OpenWithFolderDialogProps extends RWState<'open', boolean> {
  collectionId: number;
  relativePath: string;
}

export default function OpenWithFoldereDialog({
  collectionId,
  relativePath,
  open,
  setOpen
}: OpenWithFolderDialogProps) {
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
              to={`${baseURL}app/tag`}
              state={{ mode: 'folder', collectionId, relativePath }}
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
