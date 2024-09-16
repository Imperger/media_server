import { MovieCreation as MovieCreationIcon } from '@mui/icons-material';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import { Location, useLocation } from 'react-router-dom';

import FilmStrip from './film-strip';
import SaveClipDialog from './save-dialog';
import { ClipBoundary } from './types';

import { ClipAppService } from '@/api-service/clip-app-service';
import { Inversify } from '@/inversify';
import { useTitle } from '@/layout/TitleContext';
import CloseBracketIcon from '@/lib/components/icons/close-bracket-icon';
import OpenBracketIcon from '@/lib/components/icons/open-bracket-icon';
import { formatDuration } from '@/lib/format-duration';
import { Path } from '@/lib/path';
import Player from '@/player/player';

interface LocationState {
  filename: string;
  assetPrefix: string;
}

const api = Inversify.get(ClipAppService);

export default function ClipApp() {
  const baseURL = import.meta.env.BASE_URL;
  const { setTitle } = useTitle();
  const { enqueueSnackbar } = useSnackbar();
  const location: Location<LocationState> = useLocation();
  const [playerRef, setPlayerRef] = useState<HTMLVideoElement | null>(null);
  const [playTime, setPlayTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipBoundary, setClipBoundary] = useState<ClipBoundary>({
    begin: 0,
    end: 0
  });
  const [isSaveClipDialogOpen, setIsSaveClipDialogOpen] = useState(false);

  const filename = location.state?.filename ?? '';

  const [basename, setBasename] = useState(`${Path.basename(filename)}_clip`);

  const playTimeNormal = useMemo(() => {
    if (playerRef === null) {
      return 0;
    }

    return playTime / playerRef.duration;
  }, [playTime]);

  const extension = Path.extension(filename);

  const scrubbingUrl =
    `${baseURL}api/file/scrubbing/${location.state.assetPrefix}.jpg` ?? '';

  const onInit = (ref: HTMLVideoElement) => setPlayerRef(ref);

  const onSetClipBegin = () => {
    const begin = playerRef?.currentTime ?? 0;

    if (begin <= clipBoundary.end) {
      setClipBoundary({
        begin,
        end: clipBoundary.end
      });
    } else {
      setClipBoundary({
        begin: clipBoundary.end,
        end: begin
      });
    }
  };

  const onSetClipEnd = () => {
    const end = playerRef?.currentTime ?? 0;

    if (end >= clipBoundary.begin) {
      setClipBoundary({
        begin: clipBoundary.begin,
        end
      });
    } else {
      setClipBoundary({
        begin: end,
        end: clipBoundary.begin
      });
    }
  };

  const setPlayTimeNormal = (playTimeNormal: number) => {
    if (playerRef === null) {
      return;
    }

    playerRef.currentTime = playTimeNormal * playerRef.duration;
  };

  const play = (isPlaying: boolean) => {
    isPlaying ? playerRef?.play() : playerRef?.pause();
  };

  const onSaveClip = () => {
    setIsSaveClipDialogOpen(true);
    setBasename(`${Path.basename(filename)}_clip`);
  };

  const onSaveClipApply = async () => {
    const success = await api.create(
      filename,
      clipBoundary,
      `${Path.dirname(filename)}/${basename}${extension}`
    );

    const notification = success
      ? { message: 'Clip created', variant: 'info' as const }
      : { message: 'Failed to create clip', variant: 'error' as const };

    enqueueSnackbar(
      <>
        <MovieCreationIcon sx={{ marginRight: '5px' }} />
        {notification.message}
      </>,
      {
        variant: notification.variant,
        hideIconVariant: true,
        autoHideDuration: 2000
      }
    );
  };

  const durationUI = useMemo(
    () => formatDuration(clipBoundary.end - clipBoundary.begin),
    [clipBoundary]
  );

  useEffect(() => setTitle(`Clip ${filename}`), []);

  useEffect(() => {
    if (playerRef === null) {
      return;
    }

    setIsPlaying(!playerRef.paused);

    const onTimeUpdate = () => setPlayTime(playerRef.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onAbort = () => setIsPlaying(false);

    const onDurationChange = () => {
      setDuration(playerRef.duration);
      setClipBoundary({ begin: 0, end: playerRef.duration });
    };

    playerRef.addEventListener('timeupdate', onTimeUpdate);
    playerRef.addEventListener('play', onPlay);
    playerRef.addEventListener('pause', onPause);
    playerRef.addEventListener('abort', onAbort);
    playerRef.addEventListener('durationchange', onDurationChange);

    return () => {
      playerRef.removeEventListener('timeupdate', onTimeUpdate);
      playerRef.removeEventListener('play', onPlay);
      playerRef.removeEventListener('pause', onPause);
      playerRef.removeEventListener('abort', onAbort);
      playerRef.removeEventListener('durationchange', onDurationChange);
    };
  }, [playerRef]);

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ width: '100%', height: '0px', flex: '1 1 auto' }}>
        <Player onInit={onInit} playMode="file" filename={filename} />
      </Box>
      <Stack direction="row" alignItems="center">
        <IconButton onClick={onSaveClip}>
          <MovieCreationIcon />
        </IconButton>
        <IconButton onClick={onSetClipBegin}>
          <OpenBracketIcon />
        </IconButton>
        <IconButton onClick={onSetClipEnd}>
          <CloseBracketIcon />
        </IconButton>
        <Typography color="text.primary">{durationUI}</Typography>
      </Stack>
      {playerRef && (
        <FilmStrip
          scrubbingUrl={scrubbingUrl}
          isPlaying={isPlaying}
          duration={duration}
          playTimeNormal={playTimeNormal}
          setPlayTimeNormal={setPlayTimeNormal}
          play={play}
          clipBoundary={clipBoundary}
        />
      )}
      <SaveClipDialog
        open={isSaveClipDialogOpen}
        setOpen={setIsSaveClipDialogOpen}
        basename={basename}
        setBasename={setBasename}
        extension={extension}
        onApply={onSaveClipApply}
      />
    </Stack>
  );
}
