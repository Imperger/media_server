import { createBrowserRouter } from 'react-router-dom';

import FolderCollection from './collection/FolderCollection';
import Dashboard from './dashboard/Dashboard';
import Layout from './layout/Layout';
import OfflineCollection from './offline-collection/OfflineCollection';
import Player from './player/player';
import Settings from './settings/Settings';

import ClipApp from '@/apps/clip/clip-app';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '',
        element: <Dashboard />
      },
      {
        path: '/folder-collection/:id/*',
        element: <FolderCollection />
      },
      {
        path: '/offline-collection',
        element: <OfflineCollection />
      },
      {
        path: '/settings',
        element: <Settings />
      }
    ]
  },
  {
    path: '/play/:id/*',
    element: <Player playMode="file" />
  },
  {
    path: '/play-folder/:id/*',
    element: <Player playMode="folder" />
  },
  {
    path: '/app',
    element: <Layout />,
    children: [
      {
        path: 'clip',
        element: <ClipApp />
      }
    ]
  }
]);

export default router;
