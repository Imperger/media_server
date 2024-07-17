import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../hooks';
import { updateVolume } from '../player/store/player';

import styles from './player.module.css';

type VolumeType = 'previous' | 'max' | 'muted' | 'custom';

export interface VolumeSettings {
  type: VolumeType;
  value: number; // [0 - 1]
}

function Player() {
  const dispatch = useAppDispatch();
  const playerSettings = useAppSelector((state) => state.settings.player);

  const getVolumeType = () => {
    if (playerSettings.volume.type === 'custom') {
      if (playerSettings.volume.value === 0) {
        return 'muted';
      } else if (playerSettings.volume.value === 1) {
        return 'max';
      }
    }

    return playerSettings.volume.type;
  };

  const [volumeType, setVolumeType] = useState<VolumeType>(getVolumeType());

  const onVolumeTypeChanged = (e: SelectChangeEvent<VolumeType>) => {
    const type = e.target.value as VolumeType;

    setVolumeType(type);

    switch (type) {
      case 'previous':
        dispatch(
          updateVolume({ type: 'previous', value: playerSettings.volume.value })
        );
        break;
      case 'max':
        dispatch(updateVolume({ type: 'custom', value: 1 }));
        break;
      case 'muted':
        dispatch(updateVolume({ type: 'custom', value: 0 }));
        break;
      case 'custom':
        dispatch(
          updateVolume({ type: 'custom', value: playerSettings.volume.value })
        );
    }
  };

  const onVolumeValueChanged = (_event: Event, newVolume: number | number[]) =>
    dispatch(
      updateVolume({ type: playerSettings.volume.type, value: newVolume })
    );

  const isPredefined = useMemo(() => volumeType === 'custom', [volumeType]);

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="player-settings-content"
      >
        Player
      </AccordionSummary>
      <AccordionDetails className={styles.details}>
        <Typography sx={{ fontWeight: 'bold' }} variant="h6" gutterBottom>
          Volume
        </Typography>
        <Typography variant="subtitle1" className={styles.description}>
          Sets the initial volume value
        </Typography>
        <Box className={styles.volumeSettings}>
          <Select
            labelId="volume-settings-label"
            id="demo-simple-select"
            size="small"
            className={styles.volumeSettingsType}
            value={volumeType}
            onChange={onVolumeTypeChanged}
          >
            <MenuItem value={'previous'}>Previous</MenuItem>
            <MenuItem value={'max'}>Maximum</MenuItem>
            <MenuItem value={'muted'}>Muted</MenuItem>
            <MenuItem value={'custom'}>Custom</MenuItem>
          </Select>
          {isPredefined && (
            <Slider
              sx={{ minWidth: '200px', color: '#ffffff' }}
              size="small"
              aria-label="Volume"
              step={0.1}
              min={0}
              max={1}
              value={playerSettings.volume.value}
              onChange={onVolumeValueChanged}
            />
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default Player;
