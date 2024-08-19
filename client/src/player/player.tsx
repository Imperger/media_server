import { Box } from '@mui/material';
import {
  KeyboardEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Location, useLocation, useParams } from 'react-router-dom';

import { useOnline } from '../api-service/use-online';
import { useAppDispatch, useAppSelector } from '../hooks';
import { ContentCache } from '../lib/content-cache';
import {
  Gesture,
  GesturesRecognizer,
  SwipeDirecion
} from '../lib/gestures-recognizer';
import { reinterpret_cast } from '../lib/reinterpret-cast';

import Controls from './controls';
import { PlayMode } from './play-mode';
import styles from './player.module.css';
import ScrubbingOverlay from './scrubbing-overlay';
import { updateVolume } from './store/player';

import { ApiService } from '@/api-service/api-service';
import { Inversify } from '@/inversify';
import { ArrayHelper } from '@/lib/ArrayHelper';
import { useResize } from '@/lib/use-resize';

interface RewindStepProperty {
  step: number;
  touchMoveThreshold: number;
}

export interface PlayerProps {
  playMode: PlayMode;
}

interface LocationState {
  assetPrefix?: string;
}

interface PlaylistEntry {
  url: string;
  assetPrefix: string;
}

const api = Inversify.get(ApiService);

function Player({ playMode }: PlayerProps) {
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
  const { id, '*': filename } = useParams();
  const collectionId = Number.parseInt(id!);
  const windowSize = useResize();
  const isOnline = useOnline();
  const dispatch = useAppDispatch();
  const location: Location<LocationState> = useLocation();

  const playerSettings = useAppSelector((state) => state.settings.player);
  const containerRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  const [play, setPlay] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsShown, setControlsShown] = useState(true);
  const [hideTrigger, setHideTrigger] = useState(0);

  const [aspectRatio, setAspectRatio] = useState(1);

  const [isScrubblingShow, setIsScrubblingShow] = useState(false);
  const [scrubbingTimeNormal, setScrubbingTimeNormal] = useState(0);

  const [playlist, setPlaylist] = useState<PlaylistEntry[]>([]);
  const [availablePlaylist, setAvailablePlaylist] = useState<PlaylistEntry[]>(
    []
  );
  const [playingIdx, setPlayingIdx] = useState(0);
  const hasSrc = availablePlaylist.length > 0;
  const src = hasSrc ? availablePlaylist[playingIdx].url : '';

  const scrubbingStripeUrl = useMemo(
    () =>
      hasSrc
        ? `${baseURL}api/file/scrubbing/${availablePlaylist[playingIdx].assetPrefix}.jpg`
        : '',
    [availablePlaylist, playingIdx]
  );

  useEffect(() => {
    if (isOnline) {
      setAvailablePlaylist([...playlist]);
      return;
    }

    let cancelator = false;
    const fillAvailablePlaylist = async () => {
      const cachedFiles = await ContentCache.keep(playlist.map((x) => x.url));
      if (!cancelator) {
        setAvailablePlaylist(
          ArrayHelper.mergeWithFiltered(
            playlist,
            cachedFiles,
            (o, f) => o.url === f
          )
        );
      }
    };
    fillAvailablePlaylist();

    return () => void (cancelator = true);
  }, [isOnline, playlist]);

  const rescheduleHiding = () => setHideTrigger((x) => x + 1);

  const showControls = () => {
    setControlsShown(true);
    rescheduleHiding();
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

      if (playerSettings.volume.type === 'previous') {
        dispatch(updateVolume({ type: 'previous', value: volume }));
      }
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

  const onLoadMetadata = () => {
    if (playerRef.current === null) {
      return;
    }

    setAspectRatio(
      playerRef.current.videoWidth / playerRef.current.videoHeight
    );
  };

  const onScrubbingSeek = (currentTimeNormal: number) => {
    setScrubbingTimeNormal(currentTimeNormal);
    setIsScrubblingShow(true);
  };

  const onScrubbingSeekEnd = () => {
    setIsScrubblingShow(false);
  };

  useEffect(() => {
    setPlayTime(0);
    setDuration(0);
    containerRef.current?.focus();

    if (playerRef.current !== null) {
      playerRef.current.volume = playerSettings.volume.value;
    }

    switch (playMode) {
      case 'file':
        {
          const initPlaylist = async () => {
            const src = `${baseURL}api/file/content/${collectionId}/${filename}`;

            const extractAssetPrefix = async () =>
              (await fetch(src, { method: 'HEAD' })).headers.get(
                'asset-prefix'
              )!;

            setPlaylist([
              {
                url: src,
                assetPrefix:
                  location.state === null
                    ? await extractAssetPrefix()
                    : location.state.assetPrefix!
              }
            ]);
          };

          initPlaylist();
        }
        break;
      case 'folder':
        {
          const fetchFolderFileList = async () => {
            const files = await api.listFolderCollectionAllContent(
              collectionId,
              filename!
            );

            setPlaylist(
              files.map((x) => ({
                url: `${baseURL}api/file/content/${x.filename}`,
                assetPrefix: x.assetPrefix
              }))
            );
          };
          fetchFolderFileList();
        }
        break;
    }

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

  useEffect(() => {
    if (playerRef.current === null) {
      return;
    }

    playerRef.current.play();
  }, [playingIdx]);

  const scrubbingOverlayWidth = useMemo(() => {
    if (playerRef.current === null) {
      return 0;
    }

    const playerBoundingBox = playerRef.current.getBoundingClientRect();

    const playerAspectRatio =
      playerBoundingBox.width / playerBoundingBox.height;

    return playerAspectRatio > aspectRatio
      ? aspectRatio * playerBoundingBox.height
      : playerBoundingBox.width;
  }, [aspectRatio, windowSize]);

  const scrubbingOverlayHeight = useMemo(() => {
    if (playerRef.current === null) {
      return 0;
    }

    const playerBoundingBox = playerRef.current.getBoundingClientRect();
    const playerAspectRatio =
      playerBoundingBox.width / playerBoundingBox.height;
    return playerAspectRatio > aspectRatio
      ? playerBoundingBox.height
      : playerBoundingBox.width / aspectRatio;
  }, [aspectRatio, windowSize]);

  const scrubbingOverlayX = useMemo(() => {
    if (playerRef.current === null) {
      return 0;
    }

    const playerBoundingBox = playerRef.current.getBoundingClientRect();
    const playerAspectRatio =
      playerBoundingBox.width / playerBoundingBox.height;

    return playerAspectRatio > aspectRatio
      ? (playerBoundingBox.width - scrubbingOverlayWidth) / 2
      : 0;
  }, [aspectRatio, scrubbingOverlayWidth, windowSize]);

  const scrubbingOverlayY = useMemo(() => {
    if (playerRef.current === null) {
      return 0;
    }

    const playerBoundingBox = playerRef.current.getBoundingClientRect();
    const playerAspectRatio =
      playerBoundingBox.width / playerBoundingBox.height;

    return playerAspectRatio > aspectRatio
      ? 0
      : (playerBoundingBox.height - playerBoundingBox.width / aspectRatio) / 2;
  }, [aspectRatio, windowSize]);

  return (
    <Box
      ref={containerRef}
      className={styles.container}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onTouchMove={showControls}
    >
      <video
        ref={playerRef}
        className={styles.video}
        preload="metadata"
        controlsList="nodownload"
        {...(hasSrc ? { src } : {})}
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
        onCanPlay={onLoadMetadata}
        autoPlay
      ></video>
      <ScrubbingOverlay
        sx={{
          left: `${scrubbingOverlayX}px`,
          top: `${scrubbingOverlayY}px`,
          width: `${scrubbingOverlayWidth}px`,
          height: `${scrubbingOverlayHeight}px`
        }}
        className={styles.scrubbingOverlay}
        show={isScrubblingShow}
        scrubbingStripeUrl={scrubbingStripeUrl}
        videoAspectRatio={aspectRatio}
        currentTimeNormal={scrubbingTimeNormal}
      />
      <Controls
        playMode={playMode}
        shown={controlsShown}
        playTime={playTime}
        duration={duration}
        containerRef={containerRef}
        playerRef={playerRef}
        play={play}
        togglePlay={togglePlay}
        onVolume={onVolume}
        onScrubbingSeek={onScrubbingSeek}
        onScrubbingSeekEnd={onScrubbingSeekEnd}
        playlist={availablePlaylist.map((x) => x.url)}
        playingIdx={playingIdx}
        setPlayingIdx={setPlayingIdx}
      />
    </Box>
  );
}

export default Player;
