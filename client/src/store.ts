import { combineReducers, configureStore } from '@reduxjs/toolkit';

import lastWatchedReducer from './collection/store/last-watched';
import folderCollectionSortRuleReducer from './collection/store/sort-rule';
import playerSettingsReducer, {
  restorePlayerSettings
} from './player/store/player';

export const store = configureStore({
  reducer: {
    lastWatched: lastWatchedReducer,
    folderCollectionSortRule: folderCollectionSortRuleReducer,
    settings: combineReducers({ player: playerSettingsReducer })
  },
  preloadedState: { settings: { player: restorePlayerSettings() } }
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
