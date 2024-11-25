import { Tag as TagIcon } from '@mui/icons-material';
import { Box, Button, Chip, Stack } from '@mui/material';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Location, useLocation } from 'react-router-dom';

import { AddTagDialog } from './add-tag-dialog';
import { FragmentTagEditor } from './fragment-tag-editor';
import { GlobalTagEditor } from './global-tag-editor';

import { ApiService } from '@/api-service/api-service';
import {
  GlobalTagUpdateEvent,
  OnGlobalTagUpdate,
  OnTagUpdate,
  TagUpdateEvent
} from '@/api-service/live-feed';
import { MetaInfoService, Tag } from '@/api-service/meta-info';
import { Inversify } from '@/inversify';
import { useTitle } from '@/layout/TitleContext';
import { ArrayHelper } from '@/lib/ArrayHelper';
import { less } from '@/lib/comparator';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { dotArrayToTree } from '@/lib/dot-array-to-tree';
import { Path } from '@/lib/path';
import { TagParser } from '@/lib/tag-parser';
import Player from '@/player/player';
import {
  mergeWithTagTree,
  unmergeWithTagTree
} from '@/tags/tag-tree-transformation';

type EditorMode = 'global' | 'fragment';

interface LocationFileState {
  filename: string;
  assetPrefix: string;
}

function TagAppFile() {
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('global');
  const location: Location<LocationFileState> = useLocation();
  const [playerRef, setPlayerRef] = useState<HTMLVideoElement | null>(null);
  const [extraControls, setExtraControls] = useState<ReactNode | null>(null);

  const file = useMemo(
    () => Path.parse(location.state.filename),
    [location.state.filename]
  );

  const filename = location.state?.filename ?? '';

  const onInit = (ref: HTMLVideoElement) => setPlayerRef(ref);

  const isGlobalMode = editorMode === 'global';

  const onAddTagDialogOpen = () => setAddTagDialogOpen(true);

  const onSwitchMode = () =>
    setEditorMode(isGlobalMode ? 'fragment' : 'global');

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ width: '100%', height: '0px', flex: '1 1 auto' }}>
        <Player onInit={onInit} playMode="file" filename={filename} />
      </Box>
      <Box sx={{ height: '40px', whiteSpace: 'nowrap' }}>
        <Button onClick={onAddTagDialogOpen}>
          <TagIcon />
          Add tag
        </Button>
        <Button sx={{ width: '174px' }} onClick={onSwitchMode}>
          Switch to {isGlobalMode ? 'fragment' : 'global'}
        </Button>
        {extraControls}
      </Box>
      <Box sx={{ overflow: 'auto', height: '15%' }}>
        {isGlobalMode ? (
          <GlobalTagEditor
            collectionId={file.collectionId}
            filename={file.filename}
            addTagDialogOpen={addTagDialogOpen}
            setAddTagDialogOpen={setAddTagDialogOpen}
          />
        ) : (
          playerRef && (
            <FragmentTagEditor
              collectionId={file.collectionId}
              filename={file.filename}
              playerRef={playerRef}
              addTagDialogOpen={addTagDialogOpen}
              setAddTagDialogOpen={setAddTagDialogOpen}
              setExtraControls={setExtraControls}
            />
          )
        )}
      </Box>
    </Stack>
  );
}

interface LocationFolderState {
  collectionId: number;
  relativePath: string;
}

const api = Inversify.get(ApiService);
const metaInfo = Inversify.get(MetaInfoService);

function TagAppFolder() {
  const location: Location<LocationFolderState> = useLocation();
  const [attachedTags, setAttachedTags] = useState<string[]>([]);
  const [tagTree, setTagTree] = useState<TagTree>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const onTagUpdateRef = useRef<OnTagUpdate>(() => 0);
  const onGlobalTagUpdateRef = useRef<OnGlobalTagUpdate>(() => 0);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);

  const collectionId = location.state.collectionId;
  const relativePath = location.state.relativePath;

  useEffect(() => {
    const fetchAllTags = async () => {
      const tags = await metaInfo.listAllTags();

      setTags(tags);
      setTagTree(dotArrayToTree(tags, (x) => x.tag));
    };

    if (addTagDialogOpen) {
      api.liveFeed.subscribe<TagUpdateEvent>(
        'tag.update',
        (e: TagUpdateEvent) => onTagUpdateRef.current(e)
      );

      fetchAllTags();

      return () => void api.liveFeed.unsubscribe('tag.update');
    }
  }, [addTagDialogOpen]);

  const detachedTagTree = useMemo(
    () =>
      attachedTags.reduce(
        (tree, tag) => unmergeWithTagTree(tag, tree),
        tagTree
      ),
    [attachedTags, tagTree]
  );

  const onAddTag = async (tag: string) => {
    if (await metaInfo.attachFolderGlobalTag(tag, collectionId, relativePath)) {
      setAttachedTags([...attachedTags, tag]);
    }
  };

  const onDetachTag = async (tag: string) => {
    if (await metaInfo.detachFolderGlobalTag(tag, collectionId, relativePath)) {
      setAttachedTags(attachedTags.filter((x) => x !== tag));
    }
  };

  const sortedTags = useMemo(
    () =>
      attachedTags.sort((a, b) =>
        less(TagParser.label(a.toLowerCase()), TagParser.label(b.toLowerCase()))
      ),
    [attachedTags]
  );

  onTagUpdateRef.current = (e: TagUpdateEvent) => {
    switch (e.type) {
      case 'add':
        setTagTree(mergeWithTagTree(e.name, { ...tagTree }));
        setTags([...tags, { tag: e.name, style: e.style }]);
        break;
      case 'rename':
        {
          setTagTree(
            mergeWithTagTree(
              e.newName,
              unmergeWithTagTree(e.oldName, { ...tagTree })
            )
          );

          const renamedIdx = tags.findIndex((x) => x.tag === e.oldName);

          if (renamedIdx === -1) return;

          setTags([
            ...tags.slice(0, renamedIdx),
            { ...tags[renamedIdx], tag: e.newName },
            ...tags.slice(renamedIdx + 1)
          ]);
        }
        break;
      case 'delete':
        setTagTree(unmergeWithTagTree(e.name, { ...tagTree }));
        setTags(ArrayHelper.filterFirst(tags, (x) => x.tag !== e.name));

        break;
    }
  };

  onGlobalTagUpdateRef.current = (e: GlobalTagUpdateEvent) => {
    switch (e.type) {
      case 'add':
        setAttachedTags([...attachedTags, e.name]);
        break;
      case 'remove':
        setAttachedTags(
          ArrayHelper.filterFirst(attachedTags, (x) => x !== e.name)
        );
        break;
    }
  };

  const onAddTagDialogOpen = () => setAddTagDialogOpen(true);

  useEffect(() => {
    api.liveFeed.subscribe(
      `tagFolderGlobal.update_${collectionId}/${relativePath}`,
      (e: GlobalTagUpdateEvent) => onGlobalTagUpdateRef.current(e)
    );

    const fetchAttachedTags = async () => {
      setAttachedTags(
        await metaInfo.listFolderAttachedGlobalTags(collectionId, relativePath)
      );
    };
    fetchAttachedTags();

    return () =>
      void api.liveFeed.unsubscribe(
        `tagFolderGlobal.update_${collectionId}/${relativePath}`
      );
  }, []);

  return (
    <>
      <Box sx={{ height: '40px', whiteSpace: 'nowrap' }}>
        <Button onClick={onAddTagDialogOpen}>
          <TagIcon />
          Add tag
        </Button>
      </Box>
      <Box>
        {sortedTags.map((t) => (
          <Chip
            key={t}
            label={TagParser.label(t)}
            onDelete={() => onDetachTag(t)}
            sx={{ margin: '2px' }}
          />
        ))}
      </Box>
      {addTagDialogOpen && (
        <AddTagDialog
          open={addTagDialogOpen}
          setOpen={setAddTagDialogOpen}
          tagTree={detachedTagTree}
          tags={tags}
          onApply={onAddTag}
        />
      )}
    </>
  );
}

interface LocationMode {
  mode: 'file' | 'folder';
}

export default function TagApp() {
  const location: Location<LocationMode> = useLocation();
  const { setTitle } = useTitle();

  useEffect(() => setTitle('Tag app'), []);

  switch (location.state.mode) {
    case 'file':
      return <TagAppFile />;
    case 'folder':
      return <TagAppFolder />;
  }
}
