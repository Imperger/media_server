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

  React.useEffect(() => {
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
