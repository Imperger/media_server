import { useParams } from 'react-router-dom';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import {
  Fullscreen,
  Pause,
  PlayArrow,
  VolumeDown,
  VolumeMute,
  VolumeOff,
  VolumeUp
} from '@mui/icons-material';
import {
  KeyboardEvent,
  MouseEvent,
  RefObject,
  TouchEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import styles from './player.module.css';
import {
  Gesture,
  GesturesRecognizer,
  SwipeDirecion
} from '../lib/gestures-recognizer';
import { reinterpret_cast } from '../lib/reinterpret-cast';
import { formatDuration } from '../lib/format-duration';
import {
  DefaultComponentProps,
  OverridableTypeMap
} from '@mui/material/OverridableComponent';

interface RewindStepProperty {
  step: number;
  touchMoveThreshold: number;
}

interface ControlsProps {
  shown: boolean;
  playTime: number;
  duration: number;
  containerRef: RefObject<HTMLElement>;
  playerRef: RefObject<HTMLVideoElement>;
  play: boolean;
  togglePlay: () => void;
  onVolume: (volume: number) => void;
}

interface VolumeProps extends DefaultComponentProps<OverridableTypeMap> {
  volume: number;
}

const VolumeIcon = memo(({ volume, ...props }: VolumeProps) => {
  if (volume === 0) {
    return <VolumeOff {...props} />;
  } else if (volume < 0.5) {
    return <VolumeMute {...props} />;
  } else if (volume < 0.8) {
    return <VolumeDown {...props} />;
  }

  return <VolumeUp {...props} />;
});

const Controls = memo(
  ({
    shown,
    playTime,
    duration,
    containerRef,
    playerRef,
    play,
    togglePlay,
    onVolume
  }: ControlsProps) => {
    const seekContainerRef = useRef<HTMLElement>(null);
    const [volume, setVolume] = useState(1);

    const seekWidth = useMemo(() => {
      if (seekContainerRef.current === null) {
        return 0;
      }

      return (playTime / duration) * seekContainerRef.current.clientWidth;
    }, [playTime, duration]);

    const playTimeUI = useMemo(() => formatDuration(playTime), [playTime]);
    const durationUI = useMemo(() => formatDuration(duration), [duration]);

    const onSeek = (e: MouseEvent<HTMLElement>) => {
      if (playerRef.current === null) {
        return;
      }

      playerRef.current.currentTime =
        (e.nativeEvent.offsetX / e.currentTarget.clientWidth) * duration;
    };

    const onVolumeWrapper = (_event: Event, newVolume: number | number[]) => {
      const value = newVolume as number;
      setVolume(value);

      onVolume(value);
    };

    const toggleFullscreen = () => {
      const desiredOrientation = 'landscape-primary';

      if (document.fullscreenElement === containerRef.current) {
        document.exitFullscreen();
      } else {
        containerRef.current?.requestFullscreen();

        if (screen.orientation.type !== desiredOrientation) {
          // @ts-expect-error Missing lock
          screen.orientation.lock(desiredOrientation);
        }
      }
    };

    return (
      <Box className={styles.controls} sx={{ opacity: +shown }}>
        <Box ref={seekContainerRef} className={styles.seek} onClick={onSeek}>
          <Box
            sx={{ width: `${seekWidth}px` }}
            className={styles.seekProgress}
          ></Box>
        </Box>
        <Stack direction={'row'} className={styles.buttons}>
          <IconButton
            sx={{ '&:focus': { outline: 'none' } }}
            onClick={togglePlay}
          >
            {play ? (
              <Pause sx={{ fontSize: '1.5em' }}></Pause>
            ) : (
              <PlayArrow sx={{ fontSize: '1.5em' }}></PlayArrow>
            )}
          </IconButton>
          <Typography
            className={styles.time}
            color="text.primary"
            component="div"
          >{`${playTimeUI} / ${durationUI}`}</Typography>
          <Box flexGrow={1} />
          <VolumeIcon
            volume={volume}
            sx={{ fontSize: '1.5em', color: '#ffffff', marginRight: '9px' }}
          />
          <Slider
            sx={{ width: '100px', color: '#ffffff' }}
            size="small"
            aria-label="Volume"
            step={0.1}
            min={0}
            max={1}
            value={volume}
            onChange={onVolumeWrapper}
          />
          <IconButton
            sx={{ '&:focus': { outline: 'none' }, marginLeft: '15px' }}
            onClick={toggleFullscreen}
          >
            <Fullscreen sx={{ fontSize: '1.5em' }}></Fullscreen>
          </IconButton>
        </Stack>
      </Box>
    );
  }
);

function Player() {
  const hideControlsTimeout = 5000;
  const rewindMap: RewindStepProperty[] = [
    { step: 150, touchMoveThreshold: 150 },
    { step: 5, touchMoveThreshold: 50 },
    { step: 1 / 60, touchMoveThreshold: 0 }
  ];

  const [gestureRecognizer] = useState(
    new GesturesRecognizer(
      rewindMap.map((x) => ({
        ...x,
        type: 'swipe',
        direction: SwipeDirecion.Left | SwipeDirecion.Right
      }))
    )
  );

  const baseURL = import.meta.env.BASE_URL;
  const { '*': filename } = useParams();
  const containerRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  const [play, setPlay] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsShown, setControlsShown] = useState(true);
  const [hideTrigger, setHideTrigger] = useState(0);

  const resceduleHiding = () => setHideTrigger((x) => x + 1);

  const showControls = () => {
    setControlsShown(true);
    resceduleHiding();
  };

  const togglePlay = () => {
    if (playerRef.current === null) {
      return;
    }

    showControls();

    const player = playerRef.current;

    play ? player.pause() : player.play();

    setPlay(!play);
  };

  const onVolume = (volume: number) => {
    if (playerRef.current !== null) {
      playerRef.current.volume = volume;
    }

    showControls();
  };

  const rewindStepFromKbEvent = (direction: number, e: KeyboardEvent) =>
    direction *
    (e.shiftKey
      ? rewindMap[0].step
      : e.ctrlKey
        ? rewindMap[2].step
        : rewindMap[1].step);

  const rewind = (step: number) => {
    if (playerRef.current === null) {
      return;
    }

    showControls();

    playerRef.current.currentTime += step;
  };

  const onTimeUpdate = () => setPlayTime(playerRef.current?.currentTime ?? 0);
  const onDurationChange = () => setDuration(playerRef.current?.duration ?? 0);
  const onPlay = () => setPlay(true);
  const onPause = () => setPlay(false);
  const onAbort = () => setPlay(false);

  const onTouchStart = (e: TouchEvent) => gestureRecognizer.onTouchStart(e);
  const onTouchMove = (e: TouchEvent) => gestureRecognizer.onTouchMove(e);
  const onTouchCancel = (e: TouchEvent) => gestureRecognizer.onTouchCancel(e);
  const onTouchEnd = (e: TouchEvent) => gestureRecognizer.onTouchEnd(e);

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
        rewind(rewindStepFromKbEvent(-1, e));
        break;
      case 'ArrowRight':
        rewind(rewindStepFromKbEvent(1, e));
        break;
      case 'Space': {
        if (e.target === containerRef.current) {
          togglePlay();
        }

        return;
      }
    }
  };

  useEffect(() => {
    setPlayTime(0);
    setDuration(0);
    containerRef.current?.focus();

    return gestureRecognizer.addEventListener((e: Gesture) => {
      switch (e.rule.type) {
        case 'swipe':
          rewind(
            (1 - 2 * (e.data.direction & SwipeDirecion.Left)) *
              reinterpret_cast<RewindStepProperty>(e.rule).step
          );
          break;
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => setControlsShown(false),
      hideControlsTimeout
    );

    return () => clearTimeout(timer);
  }, [hideTrigger]);

  return (
    <Box
      ref={containerRef}
      className={styles.container}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
    >
      <video
        ref={playerRef}
        className={styles.video}
        preload="metadata"
        controlsList="nodownload"
        src={`${baseURL}api/file/content/${filename}`}
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onPlay={onPlay}
        onPause={onPause}
        onAbort={onAbort}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      ></video>
      <Controls
        shown={controlsShown}
        playTime={playTime}
        duration={duration}
        containerRef={containerRef}
        playerRef={playerRef}
        play={play}
        togglePlay={togglePlay}
        onVolume={onVolume}
      />
    </Box>
  );
}

export default Player;
