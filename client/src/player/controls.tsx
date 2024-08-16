import {
  Fullscreen as FullscreenIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  VolumeDown as VolumeDownIcon,
  VolumeMute as VolumeMuteIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon
} from '@mui/icons-material';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import {
  DefaultComponentProps,
  OverridableTypeMap
} from '@mui/material/OverridableComponent';
import { RefObject, memo, useState, useMemo, useEffect } from 'react';

import styles from './controls.module.css';
import { PlayMode } from './play-mode';
import SeekBar from './seek-bar';

import { useAppSelector } from '@/hooks';
import { formatDuration } from '@/lib/format-duration';
import { RWState } from '@/lib/rw-state';

interface ControlsProps extends RWState<'playingIdx', number> {
  playMode: PlayMode;
  shown: boolean;
  playTime: number;
  duration: number;
  containerRef: RefObject<HTMLElement>;
  playerRef: RefObject<HTMLVideoElement>;
  play: boolean;
  togglePlay: () => void;
  onVolume: (volume: number) => void;
  onScrubbingSeek: (currentTime: number) => void;
  onScrubbingSeekEnd: () => void;
  playlist: string[];
}

interface VolumeProps extends DefaultComponentProps<OverridableTypeMap> {
  volume: number;
}

const VolumeIcon = memo(({ volume, ...props }: VolumeProps) => {
  if (volume === 0) {
    return <VolumeOffIcon {...props} />;
  } else if (volume < 0.5) {
    return <VolumeMuteIcon {...props} />;
  } else if (volume < 0.8) {
    return <VolumeDownIcon {...props} />;
  }

  return <VolumeUpIcon {...props} />;
});

const Controls = memo(
  ({
    playMode,
    shown,
    playTime,
    duration,
    containerRef,
    playerRef,
    play,
    togglePlay,
    onVolume,
    onScrubbingSeek,
    onScrubbingSeekEnd,
    playlist,
    playingIdx,
    setPlayingIdx
  }: ControlsProps) => {
    const playerSettings = useAppSelector((state) => state.settings.player);
    const [volume, setVolume] = useState(1);

    const prevDisabled = playingIdx <= 0;
    const nextDisabled = playingIdx >= playlist.length - 1;

    const playTimeUI = useMemo(() => formatDuration(playTime), [playTime]);
    const durationUI = useMemo(() => formatDuration(duration), [duration]);

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

    const onPrev = () => setPlayingIdx((prevIdx) => prevIdx - 1);
    const onNext = () => setPlayingIdx((prevIdx) => prevIdx + 1);

    useEffect(() => setVolume(playerSettings.volume.value), []);

    return (
      <Box className={styles.controls} sx={{ opacity: +shown }}>
        <SeekBar
          playTime={playTime}
          duration={duration}
          playerRef={playerRef}
          togglePlay={togglePlay}
          onScrubbingSeek={onScrubbingSeek}
          onScrubbingSeekEnd={onScrubbingSeekEnd}
        />
        <Stack direction={'row'} className={styles.buttons}>
          <IconButton
            sx={{ '&:focus': { outline: 'none' } }}
            onClick={togglePlay}
          >
            {play ? (
              <PauseIcon sx={{ fontSize: '1.5em' }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: '1.5em' }} />
            )}
          </IconButton>
          <Typography
            className={styles.time}
            color="text.primary"
            component="div"
          >{`${playTimeUI} / ${durationUI}`}</Typography>
          {playMode === 'folder' && (
            <>
              <IconButton
                sx={{ '&:focus': { outline: 'none' } }}
                onClick={onPrev}
                disabled={prevDisabled}
              >
                <SkipPreviousIcon sx={{ fontSize: '1.5em' }} />
              </IconButton>
              <IconButton
                sx={{ '&:focus': { outline: 'none' } }}
                onClick={onNext}
                disabled={nextDisabled}
              >
                <SkipNextIcon sx={{ fontSize: '1.5em' }} />
              </IconButton>
            </>
          )}

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
            <FullscreenIcon sx={{ fontSize: '1.5em' }}></FullscreenIcon>
          </IconButton>
        </Stack>
      </Box>
    );
  }
);

export default Controls;
