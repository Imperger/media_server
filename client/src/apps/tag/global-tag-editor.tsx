import { Box, Chip } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AddTagDialog } from './add-tag-dialog';

import { ApiService } from '@/api-service/api-service';
import {
  GlobalTagUpdateEvent,
  OnGlobalTagUpdate,
  OnTagUpdate,
  TagUpdateEvent
} from '@/api-service/live-feed';
import { MetaInfoService, Tag } from '@/api-service/meta-info';
import { Inversify } from '@/inversify';
import { ArrayHelper } from '@/lib/array-helper';
import { less } from '@/lib/comparator';
import { TagTree } from '@/lib/components/tag-tree/tag-tree';
import { dotArrayToTree } from '@/lib/dot-array-to-tree';
import { RWState } from '@/lib/rw-state';
import { TagParser } from '@/lib/tag-parser';
import {
  mergeWithTagTree,
  unmergeWithTagTree
} from '@/tags/tag-tree-transformation';

export interface GlobalTagEditorProps
  extends RWState<'addTagDialogOpen', boolean> {
  collectionId: number;
  filename: string;
}

const api = Inversify.get(ApiService);
const metaInfo = Inversify.get(MetaInfoService);

export function GlobalTagEditor({
  addTagDialogOpen,
  setAddTagDialogOpen,
  collectionId,
  filename
}: GlobalTagEditorProps) {
  const [attachedTags, setAttachedTags] = useState<string[]>([]);
  const [tagTree, setTagTree] = useState<TagTree>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const onTagUpdateRef = useRef<OnTagUpdate>(() => 0);
  const onGlobalTagUpdateRef = useRef<OnGlobalTagUpdate>(() => 0);

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
    if (await metaInfo.attachFileGlobalTag(tag, collectionId, filename)) {
      setAttachedTags([...attachedTags, tag]);
    }
  };

  const onDetachTag = async (tag: string) => {
    if (await metaInfo.detachFileGlobalTag(tag, collectionId, filename)) {
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
        setTags(ArrayHelper.discardFirst(tags, (x) => x.tag === e.name));

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
          ArrayHelper.discardFirst(attachedTags, (x) => x === e.name)
        );
        break;
    }
  };

  useEffect(() => {
    api.liveFeed.subscribe(
      `tagFileGlobal.update_${collectionId}/${filename}`,
      (e: GlobalTagUpdateEvent) => onGlobalTagUpdateRef.current(e)
    );

    const fetchAttachedTags = async () => {
      setAttachedTags(
        await metaInfo.listAttachedFileGlobalTags(collectionId, filename)
      );
    };
    fetchAttachedTags();

    return () =>
      void api.liveFeed.unsubscribe(
        `tagFileGlobal.update_${collectionId}/${filename}`
      );
  }, []);

  return (
    <>
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
