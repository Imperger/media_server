import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';
import Router from './router';
import { ThemeProvider } from '@mui/material';
import { Theme } from './theme';
import { ApiContext } from './api-service/api-context';
import { ApiService } from './api-service/api-service';
import { store } from './store';

function Root() {
  const api = new ApiService('/api');

  return (
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={Theme}>
          <ApiContext.Provider value={api}>
            <RouterProvider router={Router} />
          </ApiContext.Provider>
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
