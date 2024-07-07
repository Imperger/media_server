import { ThemeProvider } from '@mui/material';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';
import { ApiContext } from './api-service/api-context';
import { ApiService } from './api-service/api-service';
import Router from './router';
import { store } from './store';
import { Theme } from './theme';

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
