import { Stack } from '@mui/material';
import { HttpStatusCode, isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ApiService,
  CollectionFolder,
  CollectionRecord,
  CollectionType
} from '../api-service/api-service';
import { useTitle } from '../layout/TitleContext';
import { less } from '../lib/comparator';
import { RejectedResponse } from '../lib/RejectedResponse';

import AddViewCard from './AddCollectionCard';
import AddCollectionDialog from './AddCollectionDialog';
import styles from './dashboard.module.css';
import FolderCollectionCard from './FolderCollectionCard';
import { CreateCollectionParameters } from './type';

import { Inversify } from '@/inversify';
import { useSnackbar } from '@/lib/hooks/use-snackbar';

interface FolderSyncProgress {
  id: number;
  size: number;
  progress: number; // [0 - 1]
  eta: number; // in seconds
}

interface FolderSyncComplete {
  id: number;
  addedFiles: number;
}

const api = Inversify.get(ApiService);

function Dashboard() {
  const { setTitle } = useTitle();
  const [collectionList, setCollectionList] = useState<CollectionRecord[]>([]);
  const [createCollectionDialogOpened, setCreateCollectionDialogOpened] =
    useState(false);
  const prefetchedSyncProgress = useRef<FolderSyncProgress[]>([]);

  useEffect(() => {
    setTitle('Dashboard');

    const fetchCollectionList = async () => {
      setCollectionList(await api.getCollecionList());

      if (prefetchedSyncProgress.current.length > 0) {
        folderSyncProgress(prefetchedSyncProgress.current);
      }
    };

    fetchCollectionList();
  }, []);

  const { enqueueSnackbar } = useSnackbar();

  const onCreate = () => setCreateCollectionDialogOpened(true);

  const onSync = async (id: number) => {
    try {
      await api.syncFolder(id);
    } catch (e) {
      if (
        isAxiosError(e) &&
        e.response?.status === HttpStatusCode.TooManyRequests
      ) {
        enqueueSnackbar('Try later', {
          variant: 'warning',
          autoHideDuration: 2000
        });
      }
    }
  };

  const onRemove = async (id: number, type: CollectionType) => {
    try {
      if (type === 'folder') {
        await api.removeCollectionFolder(id);
      }
      setCollectionList(collectionList.filter((x) => x.id !== id));
    } catch (e) {
      if (isAxiosError(e)) {
        enqueueSnackbar('Failed to remove collection', {
          variant: 'error',
          autoHideDuration: 2000
        });
      }
    }
  };

  const onApply = async ({
    caption,
    type,
    collectionId,
    folder
  }: CreateCollectionParameters) => {
    try {
      if (type === 'folder') {
        const collection = await api.createFolderCollection(
          caption,
          collectionId,
          folder
        );

        setCollectionList(
          [
            ...collectionList,
            {
              id: collection.id,
              caption,
              cover: collection.cover,
              type: 'folder',
              size: 0
            } as CollectionFolder
          ].sort(less)
        );
      } else if (type === 'view') {
        //const collection = await api.CreateViewCollection(caption);
      }
    } catch (e) {
      if (isAxiosError(e)) {
        let message = '';
        const code = (e.response?.data as RejectedResponse).code;

        switch (code) {
          case 100:
            message = 'Invalid folder path';
            break;
          case 101:
            message = `Folder with id '${collectionId}' already exists`;
            break;
        }

        enqueueSnackbar(message, {
          variant: 'error',
          autoHideDuration: 2000
        });
      }
    }
  };

  const folderSyncProgress = useCallback((progress: FolderSyncProgress[]) => {
    setCollectionList((collectionList) =>
      collectionList.map((c) => {
        const updated = progress.find((p) => p.id === c.id);

        return updated
          ? {
              ...c,
              size: updated.size,
              syncProgress: updated.progress,
              eta: updated.eta
            }
          : c;
      })
    );
  }, []);

  const folderSyncComplete = (complete: FolderSyncComplete) => {
    if (complete.addedFiles > 0) {
      enqueueSnackbar(`Added ${complete.addedFiles} files`, {
        variant: 'info',
        autoHideDuration: 2500
      });
    } else if (complete.addedFiles < 0) {
      enqueueSnackbar(`Removed ${-complete.addedFiles} files`, {
        variant: 'info',
        autoHideDuration: 2500
      });
    } else {
      enqueueSnackbar('Synced', {
        variant: 'info',
        autoHideDuration: 2000
      });
    }

    setCollectionList((collectionList) =>
      collectionList.map((c) => {
        return complete.id === c.id
          ? { ...c, syncProgress: undefined, eta: undefined }
          : c;
      })
    );
  };

  useEffect(() => {
    api.liveFeed
      .subscribe<
        FolderSyncProgress[],
        FolderSyncProgress[]
      >('folderCollection.syncProgress', folderSyncProgress)
      .then((x) => {
        if (x !== null) {
          prefetchedSyncProgress.current = x;
          folderSyncProgress(x);
        }
      });

    api.liveFeed.subscribe<FolderSyncComplete>(
      'folderCollection.syncComplete',
      folderSyncComplete
    );

    return () => {
      api.liveFeed.unsubscribe('folderCollection.syncProgress');
      api.liveFeed.unsubscribe('folderCollection.syncComplete');
    };
  }, []);

  const syncProgress = (value: number | undefined) =>
    value === undefined ? value : value * 100;

  return (
    <Stack className={styles.container} direction={'row'} flexWrap="wrap">
      <AddViewCard onCreate={onCreate} />
      {collectionList.map((x) =>
        x.type === 'folder' ? (
          <FolderCollectionCard
            key={x.id}
            id={x.id}
            caption={x.caption}
            cover={x.cover}
            size={x.size}
            syncProgress={syncProgress(x.syncProgress)}
            eta={x.eta}
            onSync={() => onSync(x.id)}
            onRemove={() => onRemove(x.id, x.type)}
          />
        ) : null
      )}

      <AddCollectionDialog
        open={createCollectionDialogOpened}
        setOpen={setCreateCollectionDialogOpened}
        onApply={onApply}
      />
    </Stack>
  );
}

export default Dashboard;
