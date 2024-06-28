import { useTitle } from '../layout/TitleContext';
import { useEffect, useState } from 'react';
import FolderCollectionCard from './FolderCollectionCard';
import { Stack } from '@mui/material';

import styles from './dashboard.module.css';
import { useApiService } from '../api-service/api-context';
import AddViewCard from './AddCollectionCard';
import AddCollectionDialog from './AddCollectionDialog';
import { CreateCollectionParameters } from './type';
import {
  CollectionFolder,
  CollectionRecord,
  CollectionType
} from '../api-service/api-service';
import { useSnackbar } from 'notistack';
import { HttpStatusCode, isAxiosError } from 'axios';
import { RejectedResponse } from '../lib/RejectedResponse';

function Dashboard() {
  const api = useApiService();

  const { setTitle } = useTitle();
  const [collectionList, setCollectionList] = useState<CollectionRecord[]>([]);
  const [createCollectionDialogOpened, setCreateCollectionDialogOpened] =
    useState(false);

  useEffect(() => {
    setTitle('Dashboard');

    const fetchCollectionList = async () =>
      setCollectionList(await api.GetCollecionList());

    fetchCollectionList();
  }, []);

  const { enqueueSnackbar } = useSnackbar();

  const onCreate = () => setCreateCollectionDialogOpened(true);

  const onSync = async (id: number) => {
    try {
      const syncResult = await api.syncFolder(id);
      if (syncResult.syncedFiles > 0) {
        enqueueSnackbar(`Added ${syncResult.syncedFiles} files`, {
          variant: 'info',
          autoHideDuration: 2500
        });
      } else if (syncResult.syncedFiles < 0) {
        enqueueSnackbar(`Removed ${-syncResult.syncedFiles} files`, {
          variant: 'info',
          autoHideDuration: 2500
        });
      } else {
        enqueueSnackbar('Synced', {
          variant: 'info',
          autoHideDuration: 2000
        });
      }
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
        await api.RemoveCollectionFolder(id);
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
        const collection = await api.CreateFolderCollection(
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
          ].sort((a, b) =>
            a.caption < b.caption ? -1 : a.caption === b.caption ? 0 : 1
          )
        );

        if (collection.syncedFiles > 0) {
          enqueueSnackbar(`Synced ${collection.syncedFiles} files`, {
            variant: 'info',
            autoHideDuration: 2500
          });
        }
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
