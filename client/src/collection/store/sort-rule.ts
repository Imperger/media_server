import {
  PayloadAction,
  SliceCaseReducers,
  SliceSelectors,
  createSlice
} from '@reduxjs/toolkit';

export interface SortRule {
  property: 'title' | 'duration' | 'size';
  order: 'asc' | 'desc' | 'none';
}

export const sortRule = createSlice<
  SortRule,
  SliceCaseReducers<SortRule>,
  string,
  SliceSelectors<SortRule>
>({
  name: 'sortTarget',
  initialState: {
    property: 'title',
    order: 'asc'
  },
  reducers: {
    updateSortRule: (state, action: PayloadAction<SortRule>) => {
      state.property = action.payload.property;
      state.order = action.payload.order;
    }
  }
});

export const { updateSortRule } = sortRule.actions;

export default sortRule.reducer;
