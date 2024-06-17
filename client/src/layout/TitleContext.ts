import { createContext, useContext } from 'react';

import { Context } from '../lib/Context';

export const TitleContext = createContext<Context<'title', string>>({
  title: '',
  setTitle: () => 0
});

export const useTitle = () => useContext(TitleContext);
