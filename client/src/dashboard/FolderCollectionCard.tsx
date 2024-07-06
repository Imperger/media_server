import {
  Box,
  Card,
  CardActions,
  CardMedia,
  IconButton,
  LinearProgress,
  Typography
} from '@mui/material';
import styles from './folder-collection-card.module.css';
import { MouseEvent, useMemo, useState } from 'react';
import { Delete, Sync } from '@mui/icons-material';
import { blueGrey, red } from '@mui/material/colors';
import { DeleteConfirmDialog } from '../collection/DeleteConfirmDialog';
import { Link } from 'react-router-dom';
import prettyBytes from 'pretty-bytes';
import { formatDuration } from '../lib/format-duration';

export interface ViewCardParams {
  id: number;
  cover: string;
  caption?: string;
  size: number;
  syncProgress?: number;
  eta?: number;
  onSync: () => void;
  onRemove: () => void;
}

interface SyncPropgressProps {
  syncProgress?: number;
  eta?: number;
}

function SyncProgress({ eta, syncProgress }: SyncPropgressProps) {
  return syncProgress !== undefined ? (
    <Box sx={{ position: 'absolute', top: 0, width: '100%' }}>
      <LinearProgress
        sx={{
          position: 'relative',
          backgroundColor: 'rgba(3, 169, 244, 0.6)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: 'rgb(21, 101, 192)'
          }
        }}
        className={styles.syncProgress}
        variant="determinate"
        value={syncProgress}
      />
      <Typography
        className={styles.syncProgressEta}
        variant="caption"
        component="div"
        color="text.secondary"
      >
        {formatDuration(eta!)}
      </Typography>
    </Box>
  ) : null;
}

function FolderCollectionCard(props: ViewCardParams) {
  const baseURL = import.meta.env.BASE_URL;
  const caption = useMemo(() => props.caption ?? '', [props.caption]);
  const [deleteConfirmDialogOpened, setDeleteConfirmDialogOpened] =
    useState(false);

  const openCollection = () => {};

  const preventDefault = (e: MouseEvent, target: () => void) => {
    e.preventDefault();
    target();
  };

  return (
    <>
      <Link key={props.id} to={`folder-collection/${props.id}`}>
        <Card
          className={styles.container}
          style={{ margin: '2px' }}
          onClick={openCollection}
        >
          <SyncProgress syncProgress={props.syncProgress} eta={props.eta} />
          <CardMedia
            component="img"
            height="140"
            image={`${baseURL}${props.cover}`}
          ></CardMedia>
          <Typography
            className={styles.title}
            gutterBottom
            variant="h5"
            component="div"
          >
            {caption}
          </Typography>
          <Typography
            className={styles.size}
            style={{ margin: 0 }}
            gutterBottom
            variant="subtitle1"
            component="div"
          >
            {prettyBytes(props.size)}
          </Typography>
          <CardActions className={styles.actions} sx={{ padding: 0 }}>
            <IconButton
              onClick={(e) => preventDefault(e, props.onSync)}
              sx={{ padding: '2px' }}
            >
              <Sync sx={{ color: blueGrey[600] }} />
            </IconButton>
            <IconButton
              onClick={(e) =>
                preventDefault(e, () => setDeleteConfirmDialogOpened(true))
              }
              style={{ margin: 0, padding: '2px' }}
            >
              <Delete sx={{ color: red[500] }} />
            </IconButton>
          </CardActions>
        </Card>
      </Link>
      <DeleteConfirmDialog
        onOk={props.onRemove}
        open={deleteConfirmDialogOpened}
        setOpen={setDeleteConfirmDialogOpened}
        filename={props.caption ?? 'Collection'}
      />
    </>
  );
}

export default FolderCollectionCard;
