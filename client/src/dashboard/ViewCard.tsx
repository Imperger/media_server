import {
  Card,
  CardActions,
  CardMedia,
  IconButton,
  Typography
} from '@mui/material';
import styles from './view-card.module.css';
import { MouseEvent, useMemo, useState } from 'react';
import { Delete, Sync } from '@mui/icons-material';
import { blueGrey, red } from '@mui/material/colors';
import { DeleteConfirmDialog } from '../collection/DeleteConfirmDialog';
import { Link } from 'react-router-dom';

export interface ViewCardParams {
  id: number;
  cover: string;
  caption?: string;
  onSync: () => void;
  onRemove: () => void;
}

function ViewCard(props: ViewCardParams) {
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

export default ViewCard;
