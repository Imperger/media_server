import { Stack, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

import { updateLastWatched } from '../../../collection/store/last-watched';
import { useAppDispatch, useAppSelector } from '../../../hooks';

import styles from './content-list.module.css';

export interface ContentListProps {
  children: ReactNode;
}

function nearestFolder(from: string, to: string): string {
  if (from.startsWith(to)) {
    const diff = from.slice(to.length + 1);
    return diff.split('/')[0];
  } else {
    return '';
  }
}

function ContentList({ children }: ContentListProps) {
  const dispatch = useAppDispatch();
  const fileListRef = useRef<HTMLDivElement | null>(null);
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const lastWatched = useAppSelector((state) => state.lastWatched.filename);

  const scrollToLastWatched = () => {
    if (fileListRef.current === null) {
      return;
    }

    const lastViewElement = fileListRef.current.querySelector(
      `a[data-index="${lastWatched}"]`
    );

    if (lastViewElement !== null) {
      lastViewElement.scrollIntoView(true);
    }
  };

  useBlocker(({ currentLocation, nextLocation }) => {
    const folderName = nearestFolder(
      decodeURI(currentLocation.pathname),
      decodeURI(nextLocation.pathname)
    );

    if (folderName !== '') {
      dispatch(updateLastWatched(folderName));
    } else {
      fileListRef.current?.scrollTo(0, 0);
    }

    return false;
  });

  useEffect(() => {
    scrollToLastWatched();
  }, [children]);

  return (
    <Stack
      ref={fileListRef}
      sx={{ overflowY: 'auto', alignContent: 'flex-start' }}
      className={styles.content}
      direction={isPortrait ? 'column' : 'row'}
      flexWrap={isPortrait ? 'nowrap' : 'wrap'}
    >
      {children}
    </Stack>
  );
}

export default ContentList;
