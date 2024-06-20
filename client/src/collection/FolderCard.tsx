import { Card, CardMedia, Link, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import styles from './folder-card.module.css';
import { Folder } from '@mui/icons-material';
import { resetLastWatched } from './store/last-watched';
import { useAppDispatch } from '../hooks';
import { useMemo } from 'react';

export interface FolderCardProps {
  name: string;
  preview: string;
}

function FolderCard({ name, preview }: FolderCardProps) {
  const { '*': path } = useParams();
  const dispatch = useAppDispatch();
  const saveLastWacthed = () => void dispatch(resetLastWatched());
  const pathPrefix = useMemo(() => `${path}${path!.length ? '/' : ''}`, [path]);

  return (
    <Link
      data-index={name}
      component={RouterLink}
      to={`${pathPrefix}${name}`}
      onClick={saveLastWacthed}
    >
      <Card className={styles.container} style={{ margin: '2px' }}>
        <CardMedia component="img" height="140" image={preview}></CardMedia>
        <Folder className={styles.folder} />
        <Typography
          className={styles.title}
          gutterBottom
          variant="h5"
          component="div"
        >
          {name}
        </Typography>
      </Card>
    </Link>
  );
}

export default FolderCard;
