import { Add } from '@mui/icons-material';
import { Card, IconButton } from '@mui/material';

import styles from './add-view-card.module.css';

export interface AddViewCardsProps {
  onCreate: () => void;
}

function AddViewCard({ onCreate }: AddViewCardsProps) {
  return (
    <Card style={{ margin: '2px' }}>
      <IconButton className={styles.button} onClick={onCreate}>
        <Add color="secondary" />
      </IconButton>
    </Card>
  );
}

export default AddViewCard;
