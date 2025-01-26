import { createContext, useContext } from 'react';

import { RWState } from '../lib/rw-state';

export const TitleContext = createContext<RWState<'title', string>>({
  title: '',
  setTitle: () => 0
});

export const useTitle = () => useContext(TitleContext);
