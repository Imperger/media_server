import {
  Card,
  CardActions,
  CardMedia,
  IconButton,
  Typography
} from '@mui/material';
import styles from './view-card.module.css';
import { MouseEvent, useMemo } from 'react';
import { Delete, Sync } from '@mui/icons-material';
import { blueGrey, red } from '@mui/material/colors';

export interface ViewCardParams {
  cover: string;
  caption?: string;
  onSync: () => void;
  onRemove: () => void;
}

function ViewCard(props: ViewCardParams) {
  const baseURL = import.meta.env.BASE_URL;
  const caption = useMemo(() => props.caption ?? '', [props.caption]);

  const openCollection = () => {};

  const preventDefault = (e: MouseEvent, target: () => void) => {
    e.preventDefault();
    target();
  };

  return (
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
          onClick={(e) => preventDefault(e, props.onRemove)}
          style={{ margin: 0, padding: '2px' }}
        >
          <Delete sx={{ color: red[500] }} />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default ViewCard;
