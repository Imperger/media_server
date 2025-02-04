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
import { ScrubbingMethod } from './store/player';

import { useAppSelector } from '@/hooks';
import { useResize } from '@/lib/hooks/use-resize';
import { MathHelper } from '@/lib/math-helper';

type OnSeekMove = (offsetX: number) => void;
type OnSeekEnd = () => void;

export interface SeekBarProps {
  playTime: number;
  duration: number;
  playerRef: RefObject<HTMLVideoElement>;
  togglePlay: () => void;
  onScrubbingSeek: (currentTime: number) => void;
  onScrubbingSeekEnd: () => void;
}

const SeekBar = memo(
  ({
    playTime,
    duration,
    playerRef,
    togglePlay,
    onScrubbingSeek,
    onScrubbingSeekEnd
  }: SeekBarProps) => {
    const scrubbingMethodSettings = useAppSelector(
      (state) => state.settings.player.scrubbing
    );

    const windowSize = useResize();

    const [scrubbingMethod, setScrubbingMethod] = useState<
      Exclude<ScrubbingMethod, 'auto'>
    >(scrubbingMethodSettings === 'auto' ? 'native' : scrubbingMethodSettings);

    const [isSeeking, setIsSeeking] = useState(false);
    const [isPlayerSeeking, setIsPlayerSeeking] = useState(false);
    const [isPlayingBeforeSeek, setIsPlayingBeforeSeek] = useState(false);
    const seekContainerRef = useRef<HTMLElement>(null);
    const documentRef = useRef(document);
    const touchIdRef = useRef(-1);
    const onSeekMoveRef = useRef<OnSeekMove>(() => 0);
    const onSeekEndRef = useRef<OnSeekEnd>(() => 0);
    const [latestSeekOffset, setLatestSeekOffset] = useState(-1);

    const seekStartTime = useRef(0);
    const thresholdSwitchToStripe = 100;

    const seekWidth = useMemo(() => {
      if (seekContainerRef.current === null) {
        return 0;
      }

      return MathHelper.clamp(
        isSeeking && scrubbingMethod === 'stripe'
          ? latestSeekOffset
          : (playTime / duration) * seekContainerRef.current.clientWidth,
        0,
        seekContainerRef.current.clientWidth
      );
    }, [
      scrubbingMethod,
      isSeeking,
      latestSeekOffset,
      playTime,
      duration,
      windowSize
    ]);

    const seek = (offsetX: number) => {
      if (playerRef.current === null || seekContainerRef.current === null) {
        return;
      }

      playerRef.current.currentTime =
        (offsetX / seekContainerRef.current.clientWidth) * duration;
    };

    const onSeekStart = (offsetX: number) => {
      if (scrubbingMethod === 'native') {
        setLatestSeekOffset(-1);
      } else if (scrubbingMethod === 'stripe') {
        setLatestSeekOffset(offsetX);
      }

      setIsSeeking(true);

      if (playerRef.current !== null) {
        setIsPlayingBeforeSeek(!playerRef.current.paused);

        if (!playerRef.current.paused) {
          togglePlay();
        }
      }

      if (scrubbingMethod === 'native') {
        seek(offsetX);
      }
    };

    const onTouchSeekStart = (e: ReactTouchEvent<HTMLElement>) => {
      if (e.changedTouches.length !== 1) {
        return;
      }

      touchIdRef.current = e.changedTouches[0].identifier;
      onSeekStart(e.changedTouches[0].clientX);
    };

    onSeekMoveRef.current = (offsetX: number) => {
      setLatestSeekOffset(offsetX);

      if (scrubbingMethod === 'native') {
        if (!isPlayerSeeking && isSeeking) {
          seek(offsetX);
        }
      } else if (scrubbingMethod === 'stripe') {
        if (seekContainerRef.current !== null) {
          onScrubbingSeek(offsetX / seekContainerRef.current.clientWidth);
        }
      }
    };

    onSeekEndRef.current = () => {
      setIsSeeking(false);

      if (scrubbingMethod === 'stripe') {
        onScrubbingSeekEnd();
      }

      if (isPlayingBeforeSeek) {
        togglePlay();
      }
    };

    const onSeekEnd = () => onSeekEndRef.current();

    const onMouseMove = (e: MouseEvent) => onSeekMoveRef.current(e.clientX);

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
      if (scrubbingMethod === 'native') {
        if (!isPlayerSeeking && isSeeking && latestSeekOffset !== -1) {
          seek(latestSeekOffset);
          setLatestSeekOffset(-1);
        }
      } else if (scrubbingMethod === 'stripe') {
        if (!isPlayerSeeking && !isSeeking && latestSeekOffset !== -1) {
          seek(latestSeekOffset);
          setLatestSeekOffset(-1);
        }
      }
    }, [latestSeekOffset, isPlayerSeeking, isSeeking]);

    useEffect(() => {
      if (playerRef.current === null) {
        return;
      }

      const player = playerRef.current;

      const onSeeking = () => {
        setIsPlayerSeeking(true);

        if (scrubbingMethodSettings === 'auto') {
          seekStartTime.current = Date.now();
        }
      };

      const onSeeked = () => {
        setIsPlayerSeeking(false);

        if (scrubbingMethodSettings === 'auto') {
          const seekTime = Date.now() - seekStartTime.current;
          if (seekTime > thresholdSwitchToStripe) {
            if (scrubbingMethod !== 'stripe') {
              setScrubbingMethod('stripe');
            }
          } else if (scrubbingMethod !== 'native') {
            setScrubbingMethod('native');
          }
        }
      };

      player.addEventListener('seeking', onSeeking);
      player.addEventListener('seeked', onSeeked);
      return () => {
        player.removeEventListener('seeked', onSeeked);
        player.removeEventListener('seeking', onSeeking);
      };
    }, [scrubbingMethod]);

    return (
      <Box
        ref={seekContainerRef}
        className={styles.seek}
        onMouseDown={(e) => onSeekStart(e.nativeEvent.offsetX)}
        onTouchStart={onTouchSeekStart}
      >
        <Box
          style={{ width: `${seekWidth}px` }}
          className={styles.seekProgress}
        ></Box>
      </Box>
    );
  }
);

export default SeekBar;
