import { Card, CardMedia, Typography } from '@mui/material';
import styles from './folder-card.module.css';
import { Folder } from '@mui/icons-material';

export interface FolderCardProps {
  name: string;
  preview: string;
}

function FolderCard({ name, preview }: FolderCardProps) {
  return (
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
  );
}

export default FolderCard;
