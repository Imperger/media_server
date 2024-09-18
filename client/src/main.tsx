import 'reflect-metadata';
import { ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';
import { ApiService } from './api-service/api-service';
import { Inversify } from './inversify';
import Router from './router';
import { store } from './store';
import { Theme } from './theme';

function Root() {
  const api = Inversify.get(ApiService);

  useEffect(() => {
    if (!isSecureContext) {
      return;
    }

    const listener = (event: MessageEvent) => {
      switch (event.data.type) {
        case 'getOnlineStatus':
          event.source?.postMessage({
            type: 'updateOnlineStatus',
            isOnline: api.liveFeed.isOnline
          });
          break;
      }
    };

    const unsub = api.liveFeed.onOnline(async (isOnline) => {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration === undefined) {
        return;
      }

      registration?.active?.postMessage({
        type: 'updateOnlineStatus',
        isOnline
      });
    });

    navigator.serviceWorker.addEventListener('message', listener);

    return () => {
      navigator.serviceWorker.removeEventListener('message', listener);
      unsub();
    };
  }, []);

  return (
    <StrictMode>
      <Provider store={store}>
        <ThemeProvider theme={Theme}>
          <SnackbarProvider maxSnack={3}>
            <RouterProvider router={Router} />
          </SnackbarProvider>
        </ThemeProvider>
      </Provider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
