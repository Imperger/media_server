import { Box } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';

import styles from './film-strip.module.css';
import { ClipBoundary } from './types';

type EventHandler = () => void;

export interface FilmStripProps {
  scrubbingUrl: string;
  isPlaying: boolean;
  duration: number;
  playTimeNormal: number;
  setPlayTimeNormal: (playTimeNormal: number) => void;
  play: (isPlaying: boolean) => void;
  clipBoundary: ClipBoundary;
}

export default function FilmStrip({
  isPlaying,
  duration,
  scrubbingUrl,
  playTimeNormal,
  setPlayTimeNormal,
  play,
  clipBoundary
}: FilmStripProps) {
  const stripRef = useRef<HTMLElement>(null);
  const playTimeNormalRef = useRef(0);
  const isPlayingBefore = useRef(false);
  const onScrollStartRef = useRef<EventHandler>(() => 0);
  const onScrollEndRef = useRef<EventHandler>(() => 0);
  const onPushedScrollStopsRef = useRef<EventHandler>(() => 0);
  const onTouchEndRef = useRef<EventHandler>(() => 0);
  const onTouchMoveRef = useRef<EventHandler>(() => 0);
  const isTouchMoved = useRef(false);
  const isScrolled = useRef(false);
  const skipNextScrollEvent = useRef(false);

  const beginClipBoundary = useMemo(() => {
    if (stripRef.current === null) {
      return 0;
    }

    const strip = stripRef.current;
    const imageStripWidth = strip.scrollWidth - strip.clientWidth;

    return (clipBoundary.begin / duration) * imageStripWidth;
  }, [clipBoundary.begin, duration]);

  const endClipBoundary = useMemo(() => {
    if (stripRef.current === null) {
      return 0;
    }

    const strip = stripRef.current;
    const imageStripWidth = strip.scrollWidth - strip.clientWidth;

    return (clipBoundary.end / duration) * imageStripWidth;
  }, [clipBoundary.end, duration]);

  useEffect(
    () => void (playTimeNormalRef.current = playTimeNormal),
    [playTimeNormal]
  );

  useEffect(() => {
    let id = -1;

    if (isPlaying) {
      let prevTimestamp = (document.timeline.currentTime as number | null) ?? 0;

      if (stripRef.current === null) {
        return;
      }

      const strip = stripRef.current;

      const imageStripWidth = strip.scrollWidth - strip.clientWidth;

      const speed = imageStripWidth / duration;

      let timeOffset = 0;
      const stripTransition = (timestamp: number) => {
        const elapsed = timestamp - prevTimestamp;
        prevTimestamp = timestamp;

        if (stripRef.current === null) {
          return;
        }

        const left = playTimeNormal * imageStripWidth + timeOffset;
        timeOffset += speed * (elapsed / 1000);

        stripRef.current.scrollTo({ left });

        id = requestAnimationFrame(stripTransition);
      };

      id = requestAnimationFrame(stripTransition);
    }

    return () => {
      if (id !== -1) {
        cancelAnimationFrame(id);
      }
    };
  }, [isPlaying, playTimeNormal]);

  onScrollStartRef.current = () => {
    isPlayingBefore.current = isPlaying;
    isScrolled.current = true;
    skipNextScrollEvent.current = isPlaying;

    if (isPlaying) {
      play(false);
    }
  };

  onScrollEndRef.current = () => {
    if (stripRef.current === null) {
      return;
    }

    const strip = stripRef.current;
    const imageStripWidth = strip.scrollWidth - strip.clientWidth;

    setPlayTimeNormal(strip.scrollLeft / imageStripWidth);

    if (isPlayingBefore.current) {
      play(true);
    }
  };

  onPushedScrollStopsRef.current = () => {
    if (isScrolled.current && !skipNextScrollEvent.current) {
      onScrollEndRef.current();
      isScrolled.current = false;
    }

    skipNextScrollEvent.current = false;
  };

  onTouchMoveRef.current = () => {
    isTouchMoved.current = true;
  };

  onTouchEndRef.current = () => {
    if (!isTouchMoved.current) {
      onScrollEndRef.current();
    }

    isTouchMoved.current = false;
  };

  useEffect(() => {
    if (stripRef.current === null) {
      return;
    }

    const strip = stripRef.current;

    const onScrollStart = () => onScrollStartRef.current();
    const onScrollEnd = () => onScrollEndRef.current();
    const onPushedScrollStops = () => onPushedScrollStopsRef.current();
    const onTouchEnd = () => onTouchEndRef.current();
    const onTouchMove = () => onTouchMoveRef.current();

    strip.addEventListener('mousedown', onScrollStart);
    strip.addEventListener('mouseup', onScrollEnd);
    strip.addEventListener('touchstart', onScrollStart);
    strip.addEventListener('touchmove', onTouchMove);
    strip.addEventListener('touchend', onTouchEnd);
    strip.addEventListener('scrollend', onPushedScrollStops);

    return () => {
      strip.removeEventListener('mousedown', onScrollStart);
      strip.removeEventListener('mouseup', onScrollEnd);
      strip.removeEventListener('touchstart', onScrollStart);
      strip.removeEventListener('touchmove', onTouchMove);
      strip.removeEventListener('touchend', onTouchEnd);
      strip.removeEventListener('scrollend', onPushedScrollStops);
    };
  }, []);

  return (
    <Box ref={stripRef} className={styles.filmStrip}>
      <Box className={styles.scrubbingImageContainer}>
        <Box
          sx={{
            left: beginClipBoundary,
            width: endClipBoundary - beginClipBoundary
          }}
          className={styles.clipBoundary}
        >
          <Box className={styles.clipBoundaryBracket}>
            <Box className={styles.clipBoundaryCeiling} />
            <Box className={styles.clipBoundaryPilar} />
            <Box className={styles.clipboardBoundaryFloor} />
          </Box>
          <Box
            className={[
              styles.clipBoundaryBracket,
              styles.clipBoundaryMirrored
            ].join(' ')}
          >
            <Box className={styles.clipBoundaryCeiling} />
            <Box className={styles.clipBoundaryPilar} />
            <Box className={styles.clipboardBoundaryFloor} />
          </Box>
        </Box>
        <Box
          className={styles.scrubbingImage}
          component="img"
          src={scrubbingUrl}
        />
      </Box>
      <Box className={styles.currentTimeCursor} />
    </Box>
  );
}
