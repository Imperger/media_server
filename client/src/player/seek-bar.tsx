import { Box } from '@mui/material';
import {
  RefObject,
  TouchEvent as ReactTouchEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import styles from './seek-bar.module.css';

type OnSeekMove = (offsetX: number) => void;
type OnSeekEnd = () => void;

export interface SeekBarProps {
  playTime: number;
  duration: number;
  playerRef: RefObject<HTMLVideoElement>;
  togglePlay: () => void;
}

const SeekBar = memo(
  ({ playTime, duration, playerRef, togglePlay }: SeekBarProps) => {
    const [isSeeking, setIsSeeking] = useState(false);
    const [isPlayerSeeking, setIsPlayerSeeking] = useState(false);
    const [isPlayingBeforeSeek, setIsPlayingBeforeSeek] = useState(false);
    const seekContainerRef = useRef<HTMLElement>(null);
    const documentRef = useRef(document);
    const touchIdRef = useRef(-1);
    const onSeekMoveRef = useRef<OnSeekMove>(() => 0);
    const onSeekEndRef = useRef<OnSeekEnd>(() => 0);

    const seekWidth = useMemo(() => {
      if (seekContainerRef.current === null) {
        return 0;
      }

      return (playTime / duration) * seekContainerRef.current.clientWidth;
    }, [playTime, duration]);

    const seek = (offsetX: number) => {
      if (playerRef.current === null || seekContainerRef.current === null) {
        return;
      }

      playerRef.current.currentTime =
        (offsetX / seekContainerRef.current.clientWidth) * duration;
    };

    const onSeekStart = (offsetX: number) => {
      setIsSeeking(true);

      if (playerRef.current !== null) {
        setIsPlayingBeforeSeek(!playerRef.current.paused);

        if (!playerRef.current.paused) {
          togglePlay();
        }
      }

      seek(offsetX);
    };

    const onTouchSeekStart = (e: ReactTouchEvent<HTMLElement>) => {
      if (e.changedTouches.length !== 1) {
        return;
      }

      touchIdRef.current = e.changedTouches[0].identifier;
      onSeekStart(e.changedTouches[0].clientX);
    };

    onSeekMoveRef.current = (offsetX: number) => {
      if (!isPlayerSeeking && isSeeking) {
        seek(offsetX);
      }
    };

    onSeekEndRef.current = () => {
      setIsSeeking(false);

      if (isPlayingBeforeSeek) {
        togglePlay();
      }
    };

    const onSeekEnd = () => onSeekEndRef.current();

    const onMouseMove = (e: MouseEvent) => onSeekMoveRef.current(e.offsetX);

    useEffect(() => {
      const document = documentRef.current;

      const onTouchMove = (e: TouchEvent) => {
        if (
          e.changedTouches.length !== 1 ||
          e.changedTouches[0].identifier !== touchIdRef.current
        ) {
          return;
        }

        onSeekMoveRef.current(e.changedTouches[0].clientX);
      };

      if (isSeeking) {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onSeekEnd);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onSeekEnd);
        return () => {
          document.removeEventListener('touchend', onSeekEnd);
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('mouseup', onSeekEnd);
          document.removeEventListener('mousemove', onMouseMove);
        };
      }
    }, [isSeeking]);

    useEffect(() => {
      if (playerRef.current === null) {
        return;
      }

      const player = playerRef.current;

      const onSeeking = () => setIsPlayerSeeking(true);
      const onSeeked = () => setIsPlayerSeeking(false);

      player.addEventListener('seeking', onSeeking);
      player.addEventListener('seeked', onSeeked);
      return () => {
        player.removeEventListener('seeked', onSeeked);
        player.removeEventListener('seeking', onSeeking);
      };
    }, []);

    return (
      <Box
        ref={seekContainerRef}
        className={styles.seek}
        onMouseDown={(e) => onSeekStart(e.nativeEvent.offsetX)}
        onTouchStart={onTouchSeekStart}
      >
        <Box
          sx={{ width: `${seekWidth}px` }}
          className={styles.seekProgress}
        ></Box>
      </Box>
    );
  }
);

export default SeekBar;
