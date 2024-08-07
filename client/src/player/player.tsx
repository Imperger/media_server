import { Box } from '@mui/material';
import { KeyboardEvent, TouchEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

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
import { updateVolume } from './store/player';

import { ApiService } from '@/api-service/api-service';
import { Inversify } from '@/inversify';

interface RewindStepProperty {
  step: number;
  touchMoveThreshold: number;
}

export interface PlayerProps {
  playMode: PlayMode;
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
  const isOnline = useOnline();
  const dispatch = useAppDispatch();
  const playerSettings = useAppSelector((state) => state.settings.player);
  const containerRef = useRef<HTMLElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  const [play, setPlay] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsShown, setControlsShown] = useState(true);
  const [hideTrigger, setHideTrigger] = useState(0);

  const [playlist, setPlaylist] = useState<string[]>([]);
  const [availablePlaylist, setAvailablePlaylist] = useState<string[]>([]);
  const [playingIdx, setPlayingIdx] = useState(0);
  const hasSrc = availablePlaylist.length > 0;
  const src = availablePlaylist[playingIdx];

  useEffect(() => {
    if (isOnline) {
      setAvailablePlaylist([...playlist]);
      return;
    }

    let cancelator = false;
    const fillAvailablePlaylist = async () => {
      const cachedFiles = await ContentCache.keep(playlist.map((x) => x));
      if (!cancelator) {
        setAvailablePlaylist(cachedFiles);
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

  useEffect(() => {
    setPlayTime(0);
    setDuration(0);
    containerRef.current?.focus();

    if (playerRef.current !== null) {
      playerRef.current.volume = playerSettings.volume.value;
    }

    switch (playMode) {
      case 'file':
        setPlaylist([`${baseURL}api/file/content/${collectionId}/${filename}`]);
        break;
      case 'folder':
        {
          const fetchFolderFileList = async () => {
            const files = await api.listFolderCollectionAllContent(
              collectionId,
              filename!
            );

            setPlaylist(
              files.map((x) => `${baseURL}api/file/content/${x.filename}`)
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
        autoPlay
      ></video>
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
        playlist={availablePlaylist}
        playingIdx={playingIdx}
        setPlayingIdx={setPlayingIdx}
      />
    </Box>
  );
}

export default Player;
