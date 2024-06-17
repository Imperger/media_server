import { createBrowserRouter } from 'react-router-dom';
import Layout from './layout/Layout';
import Player from './player/Player';
import Dashboard from './dashboard/Dashboard';
import Settings from './settings/Settings';
import FolderCollection from './collection/FolderCollection';

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
        path: '/settings',
        element: <Settings />
      }
    ]
  },
  {
    path: '/play/*',
    element: <Player />
  }
]);

export default router;
