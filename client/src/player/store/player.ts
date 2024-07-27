import {
  PayloadAction,
  SliceCaseReducers,
  SliceSelectors,
  createSlice
} from '@reduxjs/toolkit';

interface VolumeState {
  type: 'previous' | 'custom';
  value: number;
}

export interface PlayerState {
  volume: VolumeState;
}

export const playerSlice = createSlice<
  PlayerState,
  SliceCaseReducers<PlayerState>,
  string,
  SliceSelectors<PlayerState>
>({
  name: 'playerSettings',
  initialState: {
    volume: { type: 'previous', value: 1 }
  },
  reducers: {
    updateVolume: (state, action: PayloadAction<VolumeState>) => {
      state.volume.type = action.payload.type;
      state.volume.value = action.payload.value;

      localStorage.setItem('playerSettings', JSON.stringify(state));
    }
  }
});

export function restorePlayerSettings(): PlayerState {
  const settingsStr = localStorage.getItem('playerSettings');

  if (settingsStr === null) {
    return { volume: { type: 'previous', value: 1 } };
  }

  return JSON.parse(settingsStr);
}

export const { updateVolume } = playerSlice.actions;

export default playerSlice.reducer;
