import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export const lastWatchedSlice = createSlice({
  name: 'lastWatched',
  initialState: {
    filename: ''
  },
  reducers: {
    updateLastWatched: (state, action: PayloadAction<string>) => {
      state.filename = action.payload;
    },
    resetLastWatched: (state) => {
      state.filename = '';
    }
  }
});

export const { updateLastWatched, resetLastWatched } = lastWatchedSlice.actions;

export default lastWatchedSlice.reducer;
