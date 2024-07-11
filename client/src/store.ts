import { configureStore } from '@reduxjs/toolkit';

import lastWatchedReducer from './collection/store/last-watched';

export const store = configureStore({
  reducer: {
    lastWatched: lastWatchedReducer
  }
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
